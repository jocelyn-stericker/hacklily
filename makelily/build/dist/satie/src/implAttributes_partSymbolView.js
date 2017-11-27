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
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var musicxml_interfaces_1 = require("musicxml-interfaces");
var react_1 = require("react");
var DOM = require("react-dom-factories");
var PropTypes = require("prop-types");
var private_views_line_1 = require("./private_views_line");
var private_views_glyph_1 = require("./private_views_glyph");
var private_smufl_1 = require("./private_smufl");
var $Line = react_1.createFactory(private_views_line_1.default);
var $Glyph = react_1.createFactory(private_views_glyph_1.default);
var BRACE_H_SCALE = 2.9;
/**
 * Renders a piano bracket or other kind of brace.
 */
var PartSymbolView = /** @class */ (function (_super) {
    __extends(PartSymbolView, _super);
    function PartSymbolView() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    PartSymbolView.prototype.render = function () {
        if (this.props.spec.type === musicxml_interfaces_1.PartSymbolType.None) {
            return null;
        }
        var defaults = private_smufl_1.bravura.engravingDefaults; // TODO: Use 'print'
        var height = this.context.systemBottom - this.context.systemTop;
        var bottom = this.context.systemBottom;
        var symbol = this.getSymbol();
        return DOM.g(null, symbol, $Line({
            key: "line",
            stroke: "#000000",
            strokeWidth: defaults.thinBarlineThickness * 10,
            x1: this.props.spec.defaultX,
            x2: this.props.spec.defaultX,
            y1: bottom - height,
            y2: bottom
        })
        /* DOM.g */ );
    };
    PartSymbolView.prototype.getSymbol = function () {
        var spec = this.props.spec;
        var height = this.context.systemBottom - this.context.systemTop;
        var bottom = this.context.systemBottom;
        var defaults = private_smufl_1.bravura.engravingDefaults; // TODO: Use 'print'
        var x = this.props.spec.defaultX - 14;
        var s = height / 40;
        switch (spec.type) {
            case musicxml_interfaces_1.PartSymbolType.Brace:
                return $Glyph({
                    fill: "#000000",
                    glyphName: "brace",
                    key: "partSymbolMain",
                    transform: "scale(" + BRACE_H_SCALE + "," + s + ")" +
                        "translate(" + (-x * (1 - 1 / (BRACE_H_SCALE))) + "," +
                        -1 * (1 - 1 / s) * bottom + ")",
                    x: x,
                    y: bottom
                });
            case musicxml_interfaces_1.PartSymbolType.Bracket:
            case musicxml_interfaces_1.PartSymbolType.Square:// TODO: Not implemented
                return [
                    $Line({
                        key: "partSymbolMain",
                        stroke: "#000000",
                        strokeWidth: defaults.bracketThickness * 10,
                        x1: x + 4 + 2.5,
                        x2: x + 4 + 2.5,
                        y1: bottom - height - 2 - 3,
                        y2: bottom + 2 + 3
                    }),
                    $Glyph({
                        fill: "#000000",
                        glyphName: "bracketTop",
                        key: "bracketTop",
                        x: x + 4,
                        y: this.context.systemTop - 2
                    }),
                    $Glyph({
                        fill: "#000000",
                        glyphName: "bracketBottom",
                        key: "bracketBottom",
                        x: x + 4,
                        y: this.context.systemBottom + 2
                    })
                ];
            case musicxml_interfaces_1.PartSymbolType.Line:
                return null;
            default:
                throw new Error("Invalid PartSymbolType " + spec.type);
        }
    };
    PartSymbolView.contextTypes = {
        originY: PropTypes.number.isRequired,
        systemBottom: PropTypes.number.isRequired,
        systemTop: PropTypes.number.isRequired
    };
    return PartSymbolView;
}(react_1.Component));
exports.default = PartSymbolView;
//# sourceMappingURL=implAttributes_partSymbolView.js.map