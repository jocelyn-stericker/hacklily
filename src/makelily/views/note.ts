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

import MusicXML = require("musicxml-interfaces");
import * as React from "react"; // TS 1.5 workaround
import {createFactory as $, DOM, PropTypes} from "react";
import _ = require("lodash");

import Accidental from "./accidental";
import Dot from "./primitives/dot";
import Notehead from "./notehead";
import {getRight} from "../models/smufl";

class Note extends React.Component<{spec: MusicXML.Note, noteheadGlyph: string}, void> {
    render() {
        const spec = this.props.spec;

        if (spec.printObject === false) {
            return null;
        }

        let approxNotehead = this.props.noteheadGlyph;
        let width = getRight(approxNotehead);

        return DOM.g(null,
            $(Notehead)({
                key: "h",
                notehead: approxNotehead,
                spec: {
                    color: spec.color,
                    defaultX: 0,
                    defaultY: 0,
                    type: spec.notehead ? spec.notehead.type : MusicXML.NoteheadType.Normal
                }
            }),
            spec.dots && spec.printDot !== false ? _.map(spec.dots, (dot, idx) => $(Dot)({
                fill: dot.color,
                key: "_1_" + idx,
                radius: 2.4,
                x: this.context.originX + this.props.spec.defaultX + width + 6 + 6*idx,
                y: this.context.originY - this.props.spec.defaultY -
                    (dot.defaultY + (dot.relativeY || 0))
            })) : null,
            this.props.spec.accidental ? $(Accidental)({
                key: "a",
                spec: this.props.spec.accidental
            }) : null
        /* DOM.g */);
    }

    getChildContext() {
        return {
            originX: this.context.originX + this.props.spec.defaultX,
            originY: this.context.originY - this.props.spec.defaultY
        };
    }
};

module Note {
    export let childContextTypes = <any> {
        originX: PropTypes.number.isRequired,
        originY: PropTypes.number.isRequired
    };
    export let contextTypes = <any> {
        originX: PropTypes.number.isRequired,
        originY: PropTypes.number.isRequired
    };
}

export default Note;
