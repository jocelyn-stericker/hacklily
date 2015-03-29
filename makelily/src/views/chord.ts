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

import { IChord }           from "../models/engine";
import Chord                = require("../models/chord");
import Rest                 = require("./rest");
import SMuFL                = require("../models/smufl");

/**
 * Renders notes and their notations.
 */
class ChordView extends React.Component<{layout: Chord.IChordLayout}, void> {
    render(): React.ReactElement<any> {
        let layout = this.props.layout;
        let spec = layout.model;

        var lyKey = 0;
        var lyrics = _.chain(<MusicXML.Note[]><any>spec)
                        .map(n => n.lyrics)
                        .filter(l => !!l)
                        .flatten(true)
                        .filter((l: MusicXML.Lyric) => !!l)
                        .map((l: MusicXML.Lyric) => {
                            var text: any[] = [];
                            var currSyllabic = MusicXML.SyllabicType.Single;
                            for (var i = 0; i < l.lyricParts.length; ++i) {
                                switch(l.lyricParts[i]._class) {
                                    case "Syllabic":
                                        var syllabic = <MusicXML.Syllabic> l.lyricParts[i];
                                        currSyllabic = syllabic.data;
                                        break;
                                    case "Text":
                                        var textPt = <MusicXML.Text> l.lyricParts[i];
                                        var width = SMuFL.bboxes["noteheadBlack"][0]*10;
                                        text.push(React.DOM.text({
                                                textAnchor: "middle",
                                                fontSize: textPt.fontSize || "22",
                                                key: ++lyKey,
                                                // x: width/2 + (spec.x),
                                                // y: 60      + (spec.y)
                                            }, textPt.data));
                                }
                            };
                            return text;
                        })
                        .flatten()
                        .value();

        var dotOffset = SMuFL.bboxes["noteheadBlack"][0]*10 + 6; // TODO: Correct notehead

        if (!!spec[0].rest) {
            return $(Rest)({
                clef: layout.clef,
                multipleRest: layout.multipleRest,
                spec: spec[0]
            });
        }

        return null;
        // var note = Note({
        //             accidentals: spec._displayedAccidentals,
        //             accStrokes: spec.accStrokes,
        //             direction: this.props.direction || spec.direction,
        //             dotOffset: dotOffset,
        //             dotted: spec.displayDots,
        //             flag: spec.flag,
        //             hasStem: spec.hasStem,
        //             isNote: true,
        //             onLedger: spec.onLedger,
        //             lowestLine: spec.lowestLine,
        //             grace: _.map(spec._notes, n => n.grace),
        //             highestLine: spec.highestLine,
        //             startingLine: spec.startingLine,
        //             key: spec.key,
        //             lyrics: lyrics,
        //             lines: spec.lines,
        //             notehead: spec.noteheadGlyph,
        //             secondaryStroke: spec.color,
        //             stemHeight: this.props.spec.stemHeight || this.props.stemHeight,
        //             strokes: spec.strokes,
        //             tieTo: spec.tieTo && spec.tieTo.x,
        //             x: spec.x,
        //             y: spec.y},
        //         notations
        //     /* Note */);

        // if (zeroOffsetMode) {
        //     return React.DOM.g({
        //                 key: <any> spec.key /* numeric keys are okay */,
        //                 x: spec.x /* for beam */,
        //                 y: spec.y /* for beam */,
        //                 transform: "translate(" + spec.x + "," + spec.y + ")"
        //             },
        //         note
        //     /* React.DOM.g */);
        // } else {
        //     return note;
        // }
    }

    getChildContext() {
        return {
            originX:        this.context.originX + this.props.layout.x$,
            originY:        this.context.originY
        };
    }
}

/*
            this.props.hasStem && NoteStem({
                x: this.props.x,
                y: this.props.y,
                key: "_2",
                direction: direction,
                line: this.props.startingLine,
                stroke: this.props.secondaryStroke,
                height: this.props.stemHeight,
                grace: this.props.grace[0],
                notehead: this.props.notehead
            }),
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

    ledgerLines(): any {
        if (!this.props.onLedger) {
            return false;
        }
        var ret: Array<React.ReactElement<any>> = [];
        var lowest = this.props.lowestLine;
        var highest = this.props.highestLine;
        if (lowest < 0.5) {
            ret = ret.concat(_.times(Math.floor(1 - lowest), idx =>
                LedgerLine({
                    key: idx + "low",
                    line: -idx,
                    notehead: this.props.notehead,
                    x: this.props.x,
                    y: this.props.y
                })
            ));
        }
        if (highest > 5.5) {
            ret = ret.concat(_.times(Math.floor(highest - 5), idx =>
                LedgerLine({
                    key: idx + "high",
                    line: 6 + idx,
                    notehead: this.props.notehead,
                    x: this.props.x,
                    y: this.props.y
                })
            ));
        }
        invariant(ret.length !== 0, "Invalid ledger line");
        return ret;
    }
*/

module ChordView {
    export var contextTypes = <any> {
        originX:            React.PropTypes.number.isRequired,
        originY:            React.PropTypes.number.isRequired
    };
    export var childContextTypes = <any> {
        originX:            React.PropTypes.number.isRequired,
        originY:            React.PropTypes.number.isRequired
    };
}

export = ChordView;
