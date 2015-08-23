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

import {Note, Lyric, Syllabic, SyllabicType, Text, StemType} from "musicxml-interfaces";
import {createFactory as $, Component, DOM, PropTypes, ReactElement} from "react";
import {map, any, chain, max} from "lodash";

import Beam from "./beam";
import Chord from "../models/chord";
import Flag from "./flag";
import LedgerLine from "./ledgerLine";
import {DEFAULT_LYRIC_SIZE, DEFAULT_FONT} from "../models/chord/lyrics";
import NoteView from "./note";
import Notation from "./notation";
import Rest from "./rest";
import Stem from "./stem";
import UnbeamedTuplet from "./unbeamedTuplet";
import {bboxes, bravura, getRight} from "../models/smufl";

const stemThickness: number = bravura.engravingDefaults.stemThickness*10;

/**
 * Renders notes and their notations.
 */
class ChordView extends Component<{layout: Chord.IChordLayout}, void> {
    render(): ReactElement<any> {
        let layout = this.props.layout;
        let spec = layout.model;

        let maxNotehead = max(layout.model.noteheadGlyph, glyph => getRight(glyph));

        let anyVisible = any(layout.model, note => note.printObject !== false);

        if (!anyVisible) {
            return null;
        }

        let lyKey = 0;
        let lyrics = chain(<Note[]><any>spec)
            .map(n => n.lyrics)
            .filter(l => !!l)
            .flatten(true)
            .filter((l: Lyric) => !!l)
            .map((l: Lyric) => {
                let text: any[] = [];
                let currSyllabic = SyllabicType.Single;
                for (let i = 0; i < l.lyricParts.length; ++i) {
                    switch(l.lyricParts[i]._class) {
                        case "Syllabic":
                            let syllabic = <Syllabic> l.lyricParts[i];
                            currSyllabic = syllabic.data;
                            break;
                        case "Text":
                            let textPt = <Text> l.lyricParts[i];
                            let width = bboxes[maxNotehead][0]*10;
                            text.push(DOM.text({
                                    fontFamily: textPt.fontFamily || DEFAULT_FONT,
                                    fontSize: textPt.fontSize || DEFAULT_LYRIC_SIZE,
                                    key: ++lyKey,
                                    textAnchor: "middle",
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
                notehead: spec.noteheadGlyph[0],
                spec: spec[0]
            });
        }

        return DOM.g(null,
            map(spec, (noteSpec, idx) => $(NoteView)({
                key: "n" + idx,
                noteheadGlyph: spec.noteheadGlyph[idx],
                spec: noteSpec
            })),
            spec.satieStem && $(Stem)({
                bestHeight: spec.satieStem.stemHeight,
                tremolo: spec.satieStem.tremolo,
                key: "s",
                notehead: maxNotehead,
                spec: {
                    color: spec[0].stem.color || "#000000",
                    defaultX: spec[0].defaultX,
                    defaultY: (spec.satieStem.stemStart - 3)*10,
                    type: spec.satieStem.direction === 1 ?  StemType.Up : StemType.Down
                },
                width: stemThickness
            }),
            map(spec.satieLedger, lineNumber => $(LedgerLine)({
                key: "l" + lineNumber,
                notehead: maxNotehead,
                spec: {
                    color: "#000000",
                    defaultX: spec[0].defaultX,
                    defaultY: (lineNumber - 3)*10
                }
            })),
            spec.satieFlag && spec.satieStem && $(Flag)({
                key: "f",
                notehead: maxNotehead,
                spec: {
                    color: spec[0].stem.color || "$000000",
                    defaultX: spec[0].defaultX,
                    defaultY: (spec.satieStem.stemStart - 3)*10 +
                        spec.satieStem.stemHeight*spec.satieStem.direction,
                    direction: spec.satieStem.direction,
                    flag: spec.satieFlag
                },
                stemHeight: spec.satieStem.stemHeight,
                stemWidth: stemThickness
            }),
            spec.satieBeam && $(Beam)({
                key: "b",
                layout: spec.satieBeam,
                stemWidth: stemThickness,
                stroke: "black"
            }),
            spec.satieUnbeamedTuplet && $(UnbeamedTuplet)({
                key: "ut",
                layout: spec.satieUnbeamedTuplet,
                stemWidth: stemThickness,
                stroke: "black"
            }),
            map(spec, (note, idx) => map(note.notations, (notation, jdx) => $(Notation)({
                key: `N${idx}_${jdx}`,
                layout: this.props.layout,
                note: note,
                spec: notation
            }))),
            lyrics
        );
    }
}

module ChordView {
    export let contextTypes = <any> {
        originX: PropTypes.number.isRequired,
        originY: PropTypes.number.isRequired
    };
}

export default ChordView;
