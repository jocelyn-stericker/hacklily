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
let $                       = React.createFactory;

import Beam                 = require("./beam");
import Chord                = require("../models/chord");
import Flag                 = require("./flag");
import LedgerLine           = require("./ledgerLine");
import Note                 = require("./note");
import Notation             = require("./notation");
import Rest                 = require("./rest");
import Stem                 = require("./stem");
import SMuFL                = require("../models/smufl");

const stemThickness: number = SMuFL.bravura.engravingDefaults.stemThickness*10;

/**
 * Renders notes and their notations.
 */
class ChordView extends React.Component<{layout: Chord.IChordLayout}, void> {
    render(): React.ReactElement<any> {
        let layout = this.props.layout;
        let spec = layout.model;

        let maxNotehead = _.max(layout.model.satieNotehead, notehead => SMuFL.bboxes[notehead][0]);

        let anyVisible = _.any(layout.model, note => note.printObject !== false);

        if (!anyVisible) {
            return null;
        }

        let lyKey = 0;
        let lyrics = _.chain(<MusicXML.Note[]><any>spec)
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
                                        var width = SMuFL.bboxes[maxNotehead][0]*10;
                                        text.push(React.DOM.text({
                                                textAnchor: "middle",
                                                fontSize: textPt.fontSize || "22",
                                                key: ++lyKey,
                                                x: this.context.originX + this.props.layout.x$ + width/2,
                                                y: this.context.originY + 60
                                            }, textPt.data));
                                }
                            };
                            return text;
                        })
                        .flatten()
                        .value();

        if (!!spec[0].rest) {
            return $(Rest)({
                multipleRest: layout.model.satieMultipleRest,
                spec: spec[0],
                notehead: spec.satieNotehead[0]
            });
        }

        return React.DOM.g(null,
            _.map(spec, (noteSpec, idx) => $(Note)({
                key: "n" + idx,
                spec: noteSpec,
                satieNotehead: spec.satieNotehead[0]
            })),
            spec.satieStem && $(Stem)({
                key: "s",
                bestHeight: spec.satieStem.stemHeight,
                spec: {
                    color: spec[0].stem.color || "#000000",
                    defaultX: spec[0].defaultX,
                    defaultY: (spec.satieStem.stemStart - 3)*10,
                    type: spec.satieStem.direction === 1 ? MusicXML.StemType.Up : MusicXML.StemType.Down
                },
                width: stemThickness,
                notehead: maxNotehead
            }),
            _.map(spec.satieLedger, lineNumber => $(LedgerLine)({
                key: "l" + lineNumber,
                spec: {
                    defaultX: spec[0].defaultX,
                    defaultY: (lineNumber - 3)*10,
                    color: "#000000"
                },
                notehead: maxNotehead
            })),
            spec.satieFlag && $(Flag)({
                key: "f",
                spec: {
                    defaultX: spec[0].defaultX,
                    defaultY: (spec.satieStem.stemStart - 3)*10 +
                        spec.satieStem.stemHeight*spec.satieStem.direction,
                    color: spec[0].stem.color || "$000000",
                    flag: spec.satieFlag,
                    direction: spec.satieStem.direction
                },
                stemWidth: stemThickness,
                stemHeight: spec.satieStem.stemHeight,
                notehead: maxNotehead
            }),
            spec.satieBeam && $(Beam)({
                key: "b",
                layout: spec.satieBeam,
                stemWidth: stemThickness,
                tuplet: null,
                tupletsTemporary: null,
                stroke: "black"
            }),
            _.map(spec, (note, idx) => _.map(note.notations, (notation, jdx) => $(Notation)({
                key: `N${idx}_${jdx}`,
                spec: notation,
                note: note,
                layout: this.props.layout
            }))),
            lyrics
        );
    }
}

module ChordView {
    export var contextTypes = <any> {
        originX:            React.PropTypes.number.isRequired,
        originY:            React.PropTypes.number.isRequired
    };
}

export = ChordView;
