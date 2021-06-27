/**
 * This file is part of Satie music engraver <https://github.com/emilyskidsister/satie>.
 * Copyright (C) Jocelyn Stericker <jocelyn@nettek.ca> 2015 - present.
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
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
/**
 * @file Renders a tuplet number, for tuplets in beams and unbeamed tuplets.
 */
import * as React from "react";
import { AboveBelow } from "musicxml-interfaces";
import { Component } from "react";
import { last, map, reduce } from "lodash";
import Glyph from "./private_views_glyph";
import { bboxes } from "./private_smufl";
var TupletNumber = /** @class */ (function (_super) {
    __extends(TupletNumber, _super);
    function TupletNumber() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    TupletNumber.prototype.render = function () {
        var _a = this.props, x1 = _a.x1, x2 = _a.x2, y1 = _a.y1, y2 = _a.y2, tuplet = _a.tuplet;
        var placement = tuplet.placement;
        var text = tuplet.tupletActual.tupletNumber.text;
        var symbols = map(text, function (char) { return "tuplet" + char; });
        var boxes = map(symbols, function (symbol) { return bboxes[symbol]; });
        var widths = map(boxes, function (box) { return (box[0] - box[2]) * 10; });
        var width = reduce(widths, function (total, width) { return total + width; }, 0);
        var offset = (x1 + x2) / 2;
        var xs = reduce(boxes, function (memo, box) {
            memo.push(box[0] * 10 + last(memo));
            return memo;
        }, [0]);
        var y = (y1 + y2) / 2 + (placement === AboveBelow.Above ? 7.5 : 9.5);
        return (React.createElement("g", null,
            React.createElement("polygon", { fill: "white", key: "mask", points: offset -
                    width / 2 -
                    6 +
                    "," +
                    (y - boxes[0][1] * 10) +
                    " " +
                    (offset - width / 2 - 6) +
                    "," +
                    (y + boxes[0][3] * 10) +
                    " " +
                    (offset + width / 2 + 6) +
                    "," +
                    (y + boxes[0][3] * 10) +
                    " " +
                    (offset + width / 2 + 6) +
                    "," +
                    (y - boxes[0][1] * 10), stroke: "white", strokeWidth: 0 }),
            map(symbols, function (sym, index) {
                return (React.createElement(Glyph, { key: "glyph" + index, fill: "#000000", glyphName: sym, x: xs[index] + offset - width / 2, y: y }));
            })));
    };
    return TupletNumber;
}(Component));
export default TupletNumber;
//# sourceMappingURL=implChord_tupletNumberView.js.map