/**
 * @source: https://github.com/jnetterf/satie/
 *
 * @license
 * (C) Josh Netterfield <joshua@nettek.ca> 2015.
 * Part of the Satie music engraver <https://github.com/jnetterf/satie>.
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

import {Note, Lyric, Syllabic, SyllabicType, Text, StemType} from "musicxml-interfaces";
import {createFactory as $, Component, DOM, PropTypes, ReactElement} from "react";
import {map, any, chain, max} from "lodash";

import {bboxes, bravura, getRight} from "../private/smufl";
import {Targetable} from "../private/views/metadata";

import BeamView from "./beamView";
import ChordModel from "./chordModel";
import FlagView from "./flagView";
import LedgerLineView from "./ledgerLineView";
import {DEFAULT_LYRIC_SIZE, DEFAULT_FONT} from "./lyrics";
import NoteView from "./noteView";
import NotationView from "./notationView";
import RestView from "./restView";
import StemView from "./stemView";
import UnbeamedTupletView from "./unbeamedTupletView";

const stemThickness: number = bravura.engravingDefaults.stemThickness * 10;

const $BeamView = $(BeamView);
const $FlagView = $(FlagView);
const $LedgerLineView = $(LedgerLineView);
const $NoteView = $(NoteView);
const $NotationView = $(NotationView);
const $RestView = $(RestView);
const $StemView = $(StemView);
const $UnbeamedTupletView = $(UnbeamedTupletView);

export interface IProps {
    layout: ChordModel.IChordLayout;
}

/**
 * Renders notes and their notations.
 */
@Targetable()
export default class ChordView extends Component<IProps, {}> {
    static contextTypes = {
        originX: PropTypes.number.isRequired,
        originY: PropTypes.number.isRequired
    } as any;

    context: {
        originX: number;
        originY: number;
    };

    render(): ReactElement<any> {
        let freshLayout = this.props.layout.freshest();
        let freshSpec = freshLayout.model;
        let staleSpec = this.props.layout.model;
        let base = freshSpec.baseModel;

        let maxNotehead = max(base.noteheadGlyph, glyph => getRight(glyph));

        let anyVisible = any(freshSpec, note => note.printObject !== false);

        if (!anyVisible) {
            return null;
        }

        let lyKey = 0;
        let lyrics = chain(<Note[]><any>freshSpec)
            .map(n => n.lyrics)
            .filter(l => !!l)
            .flatten(true)
            .filter(l => !!l)
            .map((l: Lyric) => {
                let text: any[] = [];
                let currSyllabic = SyllabicType.Single;
                for (let i = 0; i < l.lyricParts.length; ++i) {
                    switch (l.lyricParts[i]._class) {
                        case "Syllabic":
                            let syllabic = <Syllabic> l.lyricParts[i];
                            currSyllabic = syllabic.data;
                            break;
                        case "Text":
                            let textPt = <Text> l.lyricParts[i];
                            let width = bboxes[maxNotehead][0] * 10;
                            text.push(DOM.text({
                                    fontFamily: textPt.fontFamily || DEFAULT_FONT,
                                    fontSize: textPt.fontSize || DEFAULT_LYRIC_SIZE,
                                    key: ++lyKey,
                                    textAnchor: "middle",
                                    x: this.context.originX + this.props.layout.x$ + width / 2,
                                    y: this.context.originY + 60
                                }, textPt.data));
                            break;
                        case "Extend":
                            // TODO
                            break;
                        case "Elision":
                            // TODO
                            break;
                        default:
                            throw new Error(`Unknown class ${l.lyricParts[i]._class}`);
                    }
                };
                return text;
            })
            .flatten()
            .value();

        if (!!freshSpec[0].rest) {
            return $RestView({
                multipleRest: base.satieMultipleRest,
                notehead: base.noteheadGlyph[0],
                spec: freshSpec[0]
            });
        }

        return DOM.g(null,
            map(freshSpec.baseModel as any, (noteSpec: Note, idx: number) => {
                if (!freshSpec[idx]) {
                    return null;
                }
                return $NoteView({
                    key: "n" + idx,
                    noteheadGlyph: base.noteheadGlyph[idx],
                    spec: freshSpec[idx],
                    defaultX: staleSpec[0].defaultX
                });
            }),
            base.satieStem && $StemView({
                bestHeight: base.satieStem.stemHeight,
                tremolo: base.satieStem.tremolo,
                key: "s",
                notehead: maxNotehead,
                spec: {
                    color: freshSpec[0].stem.color || "#000000",
                    defaultX: staleSpec[0].defaultX,
                    defaultY: (base.satieStem.stemStart - 3) * 10,
                    type: base.satieStem.direction === 1 ?  StemType.Up : StemType.Down
                },
                width: stemThickness
            }),
            map(base.satieLedger, lineNumber => $LedgerLineView({
                key: "l" + lineNumber,
                notehead: maxNotehead,
                spec: {
                    color: "#000000",
                    defaultX: staleSpec[0].defaultX,
                    defaultY: (lineNumber - 3) * 10
                }
            })),
            base.satieFlag && base.satieStem && $FlagView({
                key: "f",
                notehead: maxNotehead,
                spec: {
                    color: freshSpec[0].stem.color || "$000000",
                    defaultX: staleSpec[0].defaultX,
                    defaultY: (base.satieStem.stemStart - 3) * 10 +
                        base.satieStem.stemHeight * base.satieStem.direction,
                    direction: base.satieStem.direction,
                    flag: base.satieFlag
                },
                stemHeight: base.satieStem.stemHeight,
                stemWidth: stemThickness
            }),
            base.satieBeam && $BeamView({
                key: "b",
                layout: base.satieBeam,
                stemWidth: stemThickness,
                stroke: "black"
            }),
            base.satieUnbeamedTuplet && $UnbeamedTupletView({
                key: "ut",
                layout: base.satieUnbeamedTuplet,
                stemWidth: stemThickness,
                stroke: "black"
            }),
            map(freshSpec, (note, idx) => map(note.notations, (notation, jdx) => $NotationView({
                key: `N${idx}_${jdx}`,
                layout: this.props.layout,
                note: note,
                spec: notation
            }))),
            lyrics
        );
    }
}
