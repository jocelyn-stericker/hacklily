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

/**
 * @file Renders a tuplet number, for tuplets in beams and unbeamed tuplets.
 */

import {AboveBelow, Tuplet} from "musicxml-interfaces";
import {createFactory as $, Component, DOM} from "react";
import {last, map, reduce} from "lodash";

import Glyph from "./primitives/glyph";
import {bboxes} from "../models/smufl";

class TupletNumber extends Component<TupletNumber.IProps, void> {
    render(): any {
        let {x1, x2, y1, y2, tuplet} = this.props;
        let {placement} = tuplet;

        let text = (tuplet.tupletActual.tupletNumber.text);
        let symbols = map(text, char => `tuplet${char}`);
        let boxes = map(symbols, symbol => bboxes[symbol]);
        let widths = map(boxes, box => (box[0] - box[2]) * 10);

        let width = reduce(widths, (total, width) => total + width, 0);
        let offset = (x1 + x2) / 2;
        let xs = reduce(boxes, (memo, box) => {
            memo.push(box[0] * 10 + last(memo));
            return memo;
        }, [0]);
        let y = (y1 + y2) / 2 + (placement === AboveBelow.Above ? 7.5 : 9.5);

        return DOM.g(null,
            // Mask
            // FIXME: We should instead split up the rectangle into
            // two parts to avoid breaking transparent backgrounds!
            DOM.polygon({
                fill: "white",
                key: `mask`,
                points: (
                    (offset - width / 2 - 6) + "," + (y - boxes[0][1] * 10) + " " +
                    (offset - width / 2 - 6) + "," + (y + boxes[0][3] * 10) + " " +
                    (offset + width / 2 + 6) + "," + (y + boxes[0][3] * 10) + " " +
                    (offset + width / 2 + 6) + "," + (y - boxes[0][1] * 10)),
                stroke: "white",
                strokeWidth: 0
            }),

            // Glyphs
            map(symbols, (symbol, index) => {
                return $(Glyph)({
                    key: `glyph${index}`,
                    fill: "#000000",
                    glyphName: symbol,
                    x: xs[index] + offset - width / 2,
                    y: y
                });
            })
        /* DOM.g */);
    }
};

module TupletNumber {
    export interface IProps {
        tuplet: Tuplet;
        x1: number;
        x2: number;
        y1: number;
        y2: number;
    }
}

export default TupletNumber;
