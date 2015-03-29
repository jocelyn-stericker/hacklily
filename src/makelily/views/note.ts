/**
 * (C) Josh Netterfield <joshua@nettek.ca> 2015.
 * Part of the Satie music engraver <https://github.com/ripieno/satie>.
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 * 
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

"use strict";

import MusicXML             = require("musicxml-interfaces");
import React                = require("react");
import _                    = require("lodash");
import invariant            = require("react/lib/invariant");
let $                       = React.createFactory;

import Engine               = require("../models/engine");
import NoteHead             = require("./noteHead");

let countToNotehead: { [key: number]: string } = {
    [MusicXML.Count.Maxima]:    "noteheadDoubleWhole",
    [MusicXML.Count.Long]:      "noteheadDoubleWhole",
    [MusicXML.Count.Breve]:     "noteheadDoubleWhole",
    [MusicXML.Count.Whole]:     "noteheadWhole",
    [MusicXML.Count.Half]:      "noteheadHalf",
    [MusicXML.Count.Quarter]:   "noteheadBlack",
    [MusicXML.Count.Eighth]:    "noteheadBlack",
    [MusicXML.Count._16th]:     "noteheadBlack",
    [MusicXML.Count._32nd]:     "noteheadBlack",
    [MusicXML.Count._64th]:     "noteheadBlack",
    [MusicXML.Count._128th]:    "noteheadBlack",
    [MusicXML.Count._256th]:    "noteheadBlack",
    [MusicXML.Count._512th]:    "noteheadBlack",
    [MusicXML.Count._1024th]:   "noteheadBlack"
};

class Note extends React.Component<{clef: MusicXML.Clef, spec: MusicXML.Note, offsetX: number}, void> {
    render() {
        const {spec, clef, offsetX} = this.props;
        const pitch = spec.pitch;
        const stem = spec.stem;
        const direction = stem.type === MusicXML.StemType.Up ? 1 : -1; // TODO: two other options
        const notehead = countToNotehead[spec.noteType.duration];

        invariant(!!pitch, "Not implemented");

        const line =
                Engine.IChord.getClefOffset(clef) +
                ((pitch.octave || 0) - 3) * 3.5 +
                Engine.IChord.pitchOffsets[pitch.step];
        var i: number;

        return React.DOM.g(null,
            NoteHead({
                key: "_0",
                x: spec.defaultX + (spec.relativeX || 0) + (offsetX || 0),
                y: context.originY - (spec.defaultY + (spec.relativeY || 0)),
                line: line,
                stroke: this.props.strokes[idx],
                grace: this.props.grace[idx],
                notehead: this.props.notehead
            }),
            this.props.dotted ? _.times(this.props.dotted, idx => Dot({
                idx: idx,
                key: "_1_" + idx,
                stroke: this.props.strokes[0],
                radius: 2.4,
                x: this.props.x + this.props.dotOffset,
                y: this.props.y,
                line: line
            })) : null,
            this.accidental()
        /* React.DOM.g */);
    }

    getDefaultProps(): Note.IProps {
        return <Note.IProps> {
            x: 0,
            y: 0,
            lines: 3,
            dotted: null,
            hasStem: true,
            accidentals: null,
            strokes: ["black"]
        };
    }

    accidentalSpacing() {
        if (this.props.onLedger) {
            return 14.4;
        } else {
            return 12;
        }
    }
    accidental(): any {
        if (this.props.accidentals === null) {
            return false;
        }

        var accidentals = this.props.accidentals;
        accidentals = accidentals.length ? accidentals : [accidentals];

        var l = this.props.lines;
        var glyphOffset = 0;

        return _.map(accidentals, (acc: any, idx: number) => {
            var paren = false;
            if (typeof acc === "string") {
                paren = !!~acc.indexOf("p");
                acc = acc.replace("p", "")*1;
            }
            if (!isNaN(<any>acc)) {
                var glyphName: string;
                switch(acc) {
                    // Standard
                    case 2:
                        glyphName = "accidentalDoubleSharp";
                        glyphOffset += 14;
                        break;
                    case 1:
                        glyphName = "accidentalSharp";
                        break;
                    case 0:
                        glyphName = "accidentalNatural";
                        break;
                    case -1:
                        glyphName = "accidentalFlat";
                        break;
                    case -2:
                        glyphName = "accidentalDoubleFlat";
                        glyphOffset += 18;
                        break;

                    // Stein-Zimmermann
                    case -0.5:
                        glyphName = "accidentalQuarterToneFlatStein";
                        break;
                    case -1.5:
                        glyphName = "accidentalNarrowReversedFlatAndFlat";
                        glyphOffset += 18;
                        break;
                    case 0.5:
                        glyphName = "accidentalQuarterToneSharpStein";
                        break;
                    case 1.5:
                        glyphName = "accidentalThreeQuarterTonesSharpStein";
                        glyphOffset += 18;
                        break;

                    default:
                        invariant(false, "Invalid accidental");
                }
                if (paren) {
                    if (glyphOffset >= 18) {
                        glyphOffset += 5;
                    } else {
                        glyphOffset = 18;
                    }
                }
                return Accidental({
                    x: this.props.x - (glyphOffset || this.accidentalSpacing())*(this.props.grace[idx] ? 0.6 : 1.0),
                    y: this.props.y,
                    grace: this.props.grace[idx],
                    stroke: this.props.accStrokes[idx],
                    line: l[idx],
                    key: "acc_" + idx,
                    idx: idx,
                    paren: paren,
                    accidental: glyphName
                });
            } else {
                return null;
            }
        });
    }
    tie(): any {
        var Slur: typeof SlurType = require("./slur"); // Recursive.
        if (!this.props.tieTo) {
            return null;
        }

        var fullWidth = this.props.tieTo - this.props.x;
        return React.createElement(Slur, {
            key: 0,
            spec: <SlurModel>{
                direction: -this.props.direction,
                x: this.props.x + fullWidth/8 + 6,
                y: this.props.y,
                lines1: [this.props.startingLine],
                lines2: [this.props.startingLine],
                slurW: fullWidth*0.75
            }
        });
    }
};

module Note {
    export var contextTypes = <any> {
        originY:         React.PropTypes.number.isRequired
    };
}

export = Note;
