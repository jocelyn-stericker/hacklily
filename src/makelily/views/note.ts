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

import Dot                  = require("./primitives/dot");
import Notehead             = require("./notehead");

class Note extends React.Component<{clef: MusicXML.Clef, spec: MusicXML.Note, offsetX: number, onLedger: boolean}, void> {
    render() {
        const spec = this.props.spec;
        const pitch = spec.pitch;
        // const stem = spec.stem;
        // const direction = stem.type === MusicXML.StemType.Up ? 1 : -1; // TODO: two other options

        invariant(!!pitch, "Not implemented");

        return React.DOM.g(null,
            $(Notehead)({
                key: "h",
                spec: {
                    defaultX: 0,
                    defaultY: spec.defaultY,
                    color: spec.color,
                    type: MusicXML.NoteheadType.Normal // FIXME
                },
                duration: spec.noteType.duration
            }),
            spec.dots ? _.map(spec.dots, (dot, idx) => $(Dot)({
                key: "_1_" + idx,
                fill: dot.color,
                radius: 2.4,
                x: 0, // TODO
                y: 0 // TODO
            })) : null,
            this.accidental()
        /* React.DOM.g */);
    }

    accidentalSpacing() {
        if (this.props.onLedger) {
            return 14.4;
        } else {
            return 12;
        }
    }
    accidental(): any {
        let spec = this.props.spec;
        if (!spec.accidental) {
            return false;
        }

        return null;
        // var accidentals = this.props.accidentals;
        // accidentals = accidentals.length ? accidentals : [accidentals];

        // var l = this.props.lines;
        // var glyphOffset = 0;

        // return _.map(accidentals, (acc: any, idx: number) => {
        //     var paren = false;
        //     if (typeof acc === "string") {
        //         paren = !!~acc.indexOf("p");
        //         acc = acc.replace("p", "")*1;
        //     }
        //     if (!isNaN(<any>acc)) {
        //         var glyphName: string;
        //         switch(acc) {
        //             // Standard
        //             case 2:
        //                 glyphName = "accidentalDoubleSharp";
        //                 glyphOffset += 14;
        //                 break;
        //             case 1:
        //                 glyphName = "accidentalSharp";
        //                 break;
        //             case 0:
        //                 glyphName = "accidentalNatural";
        //                 break;
        //             case -1:
        //                 glyphName = "accidentalFlat";
        //                 break;
        //             case -2:
        //                 glyphName = "accidentalDoubleFlat";
        //                 glyphOffset += 18;
        //                 break;

        //             // Stein-Zimmermann
        //             case -0.5:
        //                 glyphName = "accidentalQuarterToneFlatStein";
        //                 break;
        //             case -1.5:
        //                 glyphName = "accidentalNarrowReversedFlatAndFlat";
        //                 glyphOffset += 18;
        //                 break;
        //             case 0.5:
        //                 glyphName = "accidentalQuarterToneSharpStein";
        //                 break;
        //             case 1.5:
        //                 glyphName = "accidentalThreeQuarterTonesSharpStein";
        //                 glyphOffset += 18;
        //                 break;

        //             default:
        //                 invariant(false, "Invalid accidental");
        //         }
        //         if (paren) {
        //             if (glyphOffset >= 18) {
        //                 glyphOffset += 5;
        //             } else {
        //                 glyphOffset = 18;
        //             }
        //         }
        //         return Accidental({
        //             x: this.props.x - (glyphOffset || this.accidentalSpacing())*(this.props.grace[idx] ? 0.6 : 1.0),
        //             y: this.props.y,
        //             grace: this.props.grace[idx],
        //             stroke: this.props.accStrokes[idx],
        //             line: l[idx],
        //             key: "acc_" + idx,
        //             idx: idx,
        //             paren: paren,
        //             accidental: glyphName
        //         });
        //     } else {
        //         return null;
        //     }
        // });
    }
    tie(): any {
        return null;
        // var Slur: typeof SlurType = require("./slur"); // Recursive.
        // if (!this.props.tieTo) {
        //     return null;
        // }

        // var fullWidth = this.props.tieTo - this.props.x;
        // return React.createElement(Slur, {
        //     key: 0,
        //     spec: <SlurModel>{
        //         direction: -this.props.direction,
        //         x: this.props.x + fullWidth/8 + 6,
        //         y: this.props.y,
        //         lines1: [this.props.startingLine],
        //         lines2: [this.props.startingLine],
        //         slurW: fullWidth*0.75
        //     }
        // });
    }
};

module Note {
    export var contextTypes = <any> {
        originY:         React.PropTypes.number.isRequired
    };
}

/*
            this.props.flag && Flag({
                key: "_3",
                x: this.props.x,
                y: this.props.y,
                line: this.props.startingLine,
                stroke: this.props.secondaryStroke,
                stemHeight: this.props.stemHeight,
                stemWidth: 1.4,
                flag: this.props.flag,
                notehead: this.props.notehead,
                grace: this.props.grace[0],
                direction: direction
            }),
            this.tie(),
            this.props.lyrics
*/

export = Note;
