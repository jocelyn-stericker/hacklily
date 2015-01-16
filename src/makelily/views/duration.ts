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

import React                = require("react");
import TypedReact           = require("typed-react");
import _                    = require("lodash");
import assert               = require("assert");

import C                    = require("../stores/contracts");
import DurationModel        = require("../stores/duration");
import _Note                = require("./_note");
import PureModelViewMixin   = require("./pureModelViewMixin");
import _Rest                = require("./_rest");
import _UnbeamedTuplet      = require("./_unbeamedTuplet");

var    Note                 = React.createFactory(_Note.Component);
var    Rest                 = React.createFactory(_Rest.Component);
var    UnbeamedTuplet       = React.createFactory(_UnbeamedTuplet.Component);

/**
 * Renders notes and their notations.
 */
class Duration extends TypedReact.Component<Duration.IProps, {}> {
    render(): React.ReactElement<any> {
        var props = this.props;
        var spec = props.spec;
        assert(spec instanceof DurationModel);

        var notations: any[] = spec.continuingNotations.map(this._mapContinuingNotation).filter(n => !!n);
        // _.map(spec.displayNotations || [], (m, idx) =>
        //     NoteNotation({
        //         idx: 1,
        //         direction: props.direction,
        //         notation: m,
        //         key: idx,
        //         line: 3,
        //         notehead: props.spec.noteheadGlyph,
        //         x: NaN /*assigned later :( */,
        //         y: NaN /*assigned later :( */}) />);

        /**
         * Mode to reduce unneeded renders.
         */
        var zeroOffsetMode = !spec.isRest &&
            !_.any(spec.tieds, t => t && t.type !== C.MusicXML.StartStopContinue.Stop);

        var lyKey = 0;
        var lyrics = _.chain(spec._notes)
                        .map(n => n.lyrics)
                        .filter(l => !!l)
                        .flatten(true)
                        .filter((l: C.MusicXML.Lyric) => !!l)
                        .map((l: C.MusicXML.Lyric) => {
                            var text: any[] = [];
                            var currSyllabic = C.MusicXML.SyllabicType.Single;
                            for (var i = 0; i < l.lyricParts.length; ++i) {
                                switch(l.lyricParts[i]._class) {
                                    case "Syllabic":
                                        var syllabic = <C.MusicXML.Syllabic> l.lyricParts[i];
                                        currSyllabic = syllabic.data;
                                        break;
                                    case "Text":
                                        var textPt = <C.MusicXML.Text> l.lyricParts[i];
                                        var width = C.SMuFL.bravuraBBoxes[props.spec.noteheadGlyph][0]*10;
                                        text.push(React.DOM.text({
                                                textAnchor: "middle",
                                                fontSize: textPt.fontSize || "22",
                                                key: ++lyKey,
                                                x: width/2 + (zeroOffsetMode ? 0 : spec.x),
                                                y: 60      + (zeroOffsetMode ? 0 : spec.y)},
                                            textPt.data));
                                }
                            };
                            return text;
                        })
                        .flatten()
                        .value();

        var dotOffset = C.SMuFL.bravuraBBoxes[props.spec.noteheadGlyph || spec.restHead][0]*10 + 6;

        if (spec.isRest) {
            return Rest({
                    dotOffset: dotOffset,
                    dotted: spec.displayDots,
                    line: spec.lines,
                    key: spec.key,
                    isNote: true /* In this context, we mean not a wrapper. */,
                    notehead: spec.restHead,
                    multiRest: spec.multiRest,
                    spacing: spec.spacing,
                    stroke: spec.color,
                    x: spec.x,
                    y: spec.y},
                notations
            /* Rest */);
        }

        var note = Note({
                    accidentals: spec._displayedAccidentals,
                    accStrokes: spec.accStrokes,
                    direction: this.props.direction || spec.direction,
                    dotOffset: dotOffset,
                    dotted: spec.displayDots,
                    flag: spec.flag,
                    hasStem: spec.hasStem,
                    isNote: true,
                    onLedger: spec.onLedger,
                    lowestLine: spec.lowestLine,
                    grace: _.map(spec._notes, n => n.grace),
                    highestLine: spec.highestLine,
                    startingLine: spec.startingLine,
                    key: spec.key,
                    lyrics: lyrics,
                    lines: spec.lines,
                    notehead: spec.noteheadGlyph,
                    secondaryStroke: spec.color,
                    stemHeight: this.props.spec.stemHeight || this.props.stemHeight,
                    strokes: spec.strokes,
                    tieTo: spec.tieTo && spec.tieTo.x,
                    x: zeroOffsetMode ? 0 : spec.x,
                    y: zeroOffsetMode ? 0 : spec.y},
                notations
            /* Note */);

        if (zeroOffsetMode) {
            return React.DOM.g({
                        key: <any> spec.key /* numeric keys are okay */,
                        x: spec.x /* for beam */,
                        y: spec.y /* for beam */,
                        transform: "translate(" + spec.x + "," + spec.y + ")"
                    },
                note
            /* React.DOM.g */);
        } else {
            return note;
        }
    }

    private _mapContinuingNotation(m: DurationModel.IContinuingNotation, idx: number): any {
        switch (m.type) {
            case "tuplet":
                var d = m.getDirection();

                var first = m.body[0];
                var last = m.body[m.body.length - 1];

                var offset = 5.0*d;

                var line1 = (d === -1 ? first.lowestLine + d*first.stemHeight/40 : first.highestLine + d*first.stemHeight/40);
                var line2 = (d === -1 ?  last.lowestLine + d* last.stemHeight/40 :  last.highestLine + d* last.stemHeight/40);

                line1 = d === -1 ? Math.min(line1, 4) : Math.max(line1, 1);
                line2 = d === -1 ? Math.min(line2, 4) : Math.max(line2, 1);

                return UnbeamedTuplet({
                    key: "cn_" + idx,
                    direction: d,
                    line1: line1 + offset,
                    line2: line2 + offset,
                    stemWidth: 0,
                    stroke: "black",
                    tuplet: this.props.spec.tuplet,
                    tupletsTemporary: null,
                    width: last.x - first.x,
                    x: first.x,
                    y: first.y
                });
            default:
                console.warn("Ignoring notation of type " + m.type);
                return null;
        }
    }
}

module Duration {
    export var Component = TypedReact.createClass(Duration, <any> [PureModelViewMixin]);
    export interface IProps {
        key: number;
        spec: DurationModel;
        direction: number;
        stemHeight: number;
    }
}

export = Duration;
