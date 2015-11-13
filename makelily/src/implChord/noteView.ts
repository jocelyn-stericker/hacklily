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

import {Note, NoteheadType} from "musicxml-interfaces";
import {createFactory as $, Component, DOM, PropTypes} from "react";
import {map} from "lodash";

import Dot from "../private/views/dot";
import Glyph from "../private/views/glyph";
import {getLeft, getRight} from "../private/smufl";

import AccidentalView from "../implAttributes/accidentalView";

import NoteheadView from "./noteheadView";

const $AccidentalView = $(AccidentalView);
const $NoteheadView = $(NoteheadView);
const $Glyph = $(Glyph);

export interface IProps {
    spec: Note;
    noteheadGlyph: string;
    key?: string;
    defaultX?: number;
}

export default class NoteView extends Component<IProps, void> {
    static childContextTypes = <any> {
        originX: PropTypes.number.isRequired,
        originY: PropTypes.number.isRequired
    };

    static contextTypes = <any> {
        originX: PropTypes.number.isRequired,
        originY: PropTypes.number.isRequired
    };

    context: {
        originX: number;
        originY: number;
    };

    render(): any {
        const spec = this.props.spec;

        if (spec.printObject === false) {
            return null;
        }
        const defaultX = this.props.defaultX || spec.defaultX;

        let noteheadGlyph = this.props.noteheadGlyph;
        let right = getRight(noteheadGlyph);
        let left = getLeft(noteheadGlyph);

        let hasParens = spec.notehead && spec.notehead.parentheses;

        return DOM.g(null,
            $NoteheadView({
                key: "h",
                notehead: noteheadGlyph,
                spec: {
                    color: spec.color,
                    defaultX: 0,
                    defaultY: 0,
                    type: spec.notehead ? spec.notehead.type : NoteheadType.Normal
                }
            }),
            spec.dots && spec.printDot !== false ? map(spec.dots, (dot, idx) => $(Dot)({
                fill: dot.color,
                key: "_1_" + idx,
                radius: 2.4,
                x: this.context.originX + defaultX + right + 6 + 6 * idx,
                y: this.context.originY - this.props.spec.defaultY -
                    (dot.defaultY + (dot.relativeY || 0))
            })) : null,
            this.props.spec.accidental ? $AccidentalView({
                key: "a",
                spec: this.props.spec.accidental
            }) : null,
            hasParens && $Glyph({
                glyphName: "noteheadParenthesisRight",
                fill: "black",
                y: this.context.originY - this.props.spec.defaultY,
                x: this.context.originX + defaultX + right + 2
            }),
            hasParens && $Glyph({
                glyphName: "noteheadParenthesisLeft",
                fill: "black",
                y: this.context.originY - this.props.spec.defaultY,
                x: this.context.originX + defaultX + left - 5
            })
        /* DOM.g */);
    }

    getChildContext() {
        const defaultX = this.props.defaultX || this.props.spec.defaultX;

        return {
            originX: this.context.originX + defaultX,
            originY: this.context.originY - this.props.spec.defaultY
        };
    }
};
