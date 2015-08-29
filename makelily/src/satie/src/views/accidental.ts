/**
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

"use strict";

import {Accidental} from "musicxml-interfaces";
import {createFactory as $, Component, DOM, PropTypes} from "react";
import invariant = require("invariant");

import Glyph from "./primitives/glyph";
import IChord from "../engine/ichord";
import {bboxes} from "../models/smufl";

class AccidentalView extends Component<{spec: Accidental, key?: string | number}, void> {
    render(): any {
        let spec = this.props.spec;
        const glyphName = IChord.accidentalGlyphs[this.props.spec.accidental];
        invariant(glyphName in bboxes, "Expected a glyph, got %s", glyphName);

        const originX = this.context.originX;
        const originY = this.context.originY;
        const shift = spec.parentheses ? 4 : 0;

        let accidental = $(Glyph)({
            fill: spec.color,
            glyphName: glyphName,
            x: originX + spec.defaultX + (spec.relativeX || 0) + shift,
            y: originY - (spec.defaultY + (spec.relativeY || 0))
        });

        if (spec.parentheses || spec.bracket) {
            let width = bboxes[glyphName][0]*10; // TODO: it's actually 2 - 0!
            return DOM.g(null,
                $(Glyph)({
                    fill: "#000000",
                    glyphName: "accidentalParensLeft",
                    x: originX + spec.defaultX + (spec.relativeX || 0) - 7 + shift,
                    y: originY - (spec.defaultY + (spec.relativeY || 0))
                }),
                accidental,
                $(Glyph)({
                    fill: "#000000",
                    glyphName: "accidentalParensRight",
                    x: originX + spec.defaultX + (spec.relativeX || 0) + width + shift,
                    y: originY - (spec.defaultY + (spec.relativeY || 0))
                })
            /* DOM.g */);
        } else {
            return accidental;
        }
    }
}

module AccidentalView {
    export let contextTypes = <any> {
        originX: PropTypes.number.isRequired,
        originY: PropTypes.number.isRequired
    };
}

export default AccidentalView;
