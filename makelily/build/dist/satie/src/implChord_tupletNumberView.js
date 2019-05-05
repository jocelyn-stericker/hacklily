"use strict";
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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @file Renders a tuplet number, for tuplets in beams and unbeamed tuplets.
 */
var React = __importStar(require("react"));
var musicxml_interfaces_1 = require("musicxml-interfaces");
var react_1 = require("react");
var lodash_1 = require("lodash");
var private_views_glyph_1 = __importDefault(require("./private_views_glyph"));
var private_smufl_1 = require("./private_smufl");
var TupletNumber = /** @class */ (function (_super) {
    __extends(TupletNumber, _super);
    function TupletNumber() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    TupletNumber.prototype.render = function () {
        var _a = this.props, x1 = _a.x1, x2 = _a.x2, y1 = _a.y1, y2 = _a.y2, tuplet = _a.tuplet;
        var placement = tuplet.placement;
        var text = tuplet.tupletActual.tupletNumber.text;
        var symbols = lodash_1.map(text, function (char) { return "tuplet" + char; });
        var boxes = lodash_1.map(symbols, function (symbol) { return private_smufl_1.bboxes[symbol]; });
        var widths = lodash_1.map(boxes, function (box) { return (box[0] - box[2]) * 10; });
        var width = lodash_1.reduce(widths, function (total, width) { return total + width; }, 0);
        var offset = (x1 + x2) / 2;
        var xs = lodash_1.reduce(boxes, function (memo, box) {
            memo.push(box[0] * 10 + lodash_1.last(memo));
            return memo;
        }, [0]);
        var y = (y1 + y2) / 2 + (placement === musicxml_interfaces_1.AboveBelow.Above ? 7.5 : 9.5);
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
            lodash_1.map(symbols, function (sym, index) {
                return (React.createElement(private_views_glyph_1.default, { key: "glyph" + index, fill: "#000000", glyphName: sym, x: xs[index] + offset - width / 2, y: y }));
            })));
    };
    return TupletNumber;
}(react_1.Component));
exports.default = TupletNumber;
//# sourceMappingURL=implChord_tupletNumberView.js.map