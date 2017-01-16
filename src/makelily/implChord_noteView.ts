/**
 * This file is part of Satie music engraver <https://github.com/jnetterf/satie>.
 * Copyright (C) Joshua Netterfield <joshua.ca> 2015 - present.
 * 
 * Satie is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 * 
 * Satie is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 * 
 * You should have received a copy of the GNU Affero General Public License
 * along with Satie.  If not, see <http://www.gnu.org/licenses/>.
 */

import {Note, NoteheadType} from "musicxml-interfaces";
import {createFactory, Component, DOM, PropTypes} from "react";
import {map} from "lodash";

import Dot from "./private_views_dot";
import Glyph from "./private_views_glyph";
import {getLeft, getRight} from "./private_smufl";

import AccidentalView from "./implAttributes_accidentalView";
import NoteheadView from "./implChord_noteheadView";

const $AccidentalView = createFactory(AccidentalView);
const $Dot = createFactory(Dot);
const $NoteheadView = createFactory(NoteheadView);
const $Glyph = createFactory(Glyph);

export interface IProps {
    spec: Note;
    noteheadGlyph: string;
    key?: string;
    defaultX?: number;
}

export default class NoteView extends Component<IProps, void> {
    static childContextTypes = <any> {
        originY: PropTypes.number.isRequired
    };

    static contextTypes = <any> {
        originY: PropTypes.number.isRequired
    };

    context: {
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
                    defaultX,
                    defaultY: 0,
                    type: spec.notehead ? spec.notehead.type : NoteheadType.Normal
                }
            }),
            spec.dots && spec.printDot !== false ? map(spec.dots, (dot, idx) => $Dot({
                fill: dot.color,
                key: "_1_" + idx,
                radius: 2.4,
                x: defaultX + right + 6 + 6 * idx,
                y: this.context.originY - this.props.spec.defaultY -
                    (dot.defaultY + (dot.relativeY || 0))
            })) : null,
            this.props.spec.accidental ? $AccidentalView({
                key: "a",
                spec: this.props.spec.accidental,
                noteDefaultX: defaultX,
            }) : null,
            hasParens && $Glyph({
                glyphName: "noteheadParenthesisRight",
                fill: "black",
                y: this.context.originY - this.props.spec.defaultY,
                x: defaultX + right + 2
            }),
            hasParens && $Glyph({
                glyphName: "noteheadParenthesisLeft",
                fill: "black",
                y: this.context.originY - this.props.spec.defaultY,
                x: defaultX + left - 5
            })
        /* DOM.g */);
    }

    getChildContext() {
        return {
            originY: this.context.originY - this.props.spec.defaultY
        };
    }
};
