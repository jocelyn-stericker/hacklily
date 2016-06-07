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

import {PartSymbol, PartSymbolType} from "musicxml-interfaces";
import {createFactory as $, Component, DOM, PropTypes} from "react";

import Line from "../private/views/line";
import Glyph from "../private/views/glyph";
import {bravura} from "../private/smufl";

const BRACE_H_SCALE = 2.9;

export interface IProps {
    key?: string | number;
    spec: PartSymbol;
}

/**
 * Renders a piano bracket or other kind of brace.
 */
export default class PartSymbolView extends Component<IProps, void> {
    static contextTypes = {
        originY: PropTypes.number.isRequired,
        systemBottom: PropTypes.number.isRequired,
        systemTop: PropTypes.number.isRequired
    } as any;

    context: {
        originY: number;
        systemBottom: number;
        systemTop: number;
    };

    render(): any {
        if (this.props.spec.type === PartSymbolType.None) {
            return null;
        }

        const defaults = bravura.engravingDefaults; // TODO: Use 'print'

        const height = this.context.systemBottom - this.context.systemTop;
        const bottom = this.context.systemBottom;

        let symbol = this.getSymbol();
        return DOM.g(null,
            symbol,
            $(Line)({
                key: "line",
                stroke: "#000000",
                strokeWidth: defaults.thinBarlineThickness * 10,
                x1: this.props.spec.defaultX,
                x2: this.props.spec.defaultX,
                y1: bottom - height,
                y2: bottom
            })
        /* DOM.g */);
    }

    getSymbol(): any {
        const spec = this.props.spec;

        const height = this.context.systemBottom - this.context.systemTop;
        const bottom = this.context.systemBottom;

        const defaults = bravura.engravingDefaults; // TODO: Use 'print'

        const x = this.props.spec.defaultX - 14;

        const s = height / 40;

        switch (spec.type) {
            case PartSymbolType.Brace:
                return $(Glyph)({
                    fill: "#000000",
                    glyphName: "brace",
                    key: "partSymbolMain",
                    transform: "scale(" + BRACE_H_SCALE + "," + s + ")" +
                        "translate(" + (-x * (1 - 1 / (BRACE_H_SCALE))) + "," +
                        -1 * (1 - 1 / s) * bottom + ")",
                    x: x,
                    y: bottom
                });
            case PartSymbolType.Bracket:
            case PartSymbolType.Square: // TODO: Not implemented
                return [
                    $(Line)({
                        key: "partSymbolMain",
                        stroke: "#000000",
                        strokeWidth: defaults.bracketThickness * 10,
                        x1: x + 4 + 2.5,
                        x2: x + 4 + 2.5,
                        y1: bottom - height - 2 - 3,
                        y2: bottom + 2 + 3
                    }),
                    $(Glyph)({
                        fill: "#000000",
                        glyphName: "bracketTop",
                        key: "bracketTop",
                        x: x + 4,
                        y: this.context.systemTop - 2
                    }),
                    $(Glyph)({
                        fill: "#000000",
                        glyphName: "bracketBottom",
                        key: "bracketBottom",
                        x: x + 4,
                        y: this.context.systemBottom + 2
                    })
                ];
            case PartSymbolType.Line:
                return null;
            default:
                throw new Error(`Invalid PartSymbolType ${spec.type}`);
        }
    }
}
