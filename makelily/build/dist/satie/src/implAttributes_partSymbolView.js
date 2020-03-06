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
import * as React from "react";
import { PartSymbolType } from "musicxml-interfaces";
import { Component } from "react";
import * as PropTypes from "prop-types";
import Line from "./private_views_line";
import Glyph from "./private_views_glyph";
import { bravura } from "./private_smufl";
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
        if (this.props.spec.type === PartSymbolType.None) {
            return null;
        }
        var defaults = bravura.engravingDefaults; // TODO: Use 'print'
        var height = this.context.systemBottom - this.context.systemTop;
        var bottom = this.context.systemBottom;
        var sym = this.getSymbol();
        return (React.createElement("g", null,
            sym,
            React.createElement(Line, { key: "line", stroke: "#000000", strokeWidth: defaults.thinBarlineThickness * 10, x1: this.props.spec.defaultX, x2: this.props.spec.defaultX, y1: bottom - height, y2: bottom })));
    };
    PartSymbolView.prototype.getSymbol = function () {
        var spec = this.props.spec;
        var height = this.context.systemBottom - this.context.systemTop;
        var bottom = this.context.systemBottom;
        var defaults = bravura.engravingDefaults; // TODO: Use 'print'
        var x = this.props.spec.defaultX - 14;
        var s = height / 40;
        switch (spec.type) {
            case PartSymbolType.Brace:
                return (React.createElement(Glyph, { fill: "#000000", glyphName: "brace", key: "partSymbolMain", transform: "scale(" +
                        BRACE_H_SCALE +
                        "," +
                        s +
                        ")" +
                        "translate(" +
                        -x * (1 - 1 / BRACE_H_SCALE) +
                        "," +
                        -1 * (1 - 1 / s) * bottom +
                        ")", x: x, y: bottom }));
            case PartSymbolType.Bracket:
            case PartSymbolType.Square: // TODO: Not implemented
                return [
                    React.createElement(Line, { key: "partSymbolMain", stroke: "#000000", strokeWidth: defaults.bracketThickness * 10, x1: x + 4 + 2.5, x2: x + 4 + 2.5, y1: bottom - height - 2 - 3, y2: bottom + 2 + 3 }),
                    React.createElement(Glyph, { fill: "#000000", glyphName: "bracketTop", key: "bracketTop", x: x + 4, y: this.context.systemTop - 2 }),
                    React.createElement(Glyph, { fill: "#000000", glyphName: "bracketBottom", key: "bracketBottom", x: x + 4, y: this.context.systemBottom + 2 }),
                ];
            case PartSymbolType.Line:
                return null;
            default:
                throw new Error("Invalid PartSymbolType " + spec.type);
        }
    };
    PartSymbolView.contextTypes = {
        originY: PropTypes.number.isRequired,
        systemBottom: PropTypes.number.isRequired,
        systemTop: PropTypes.number.isRequired,
    };
    return PartSymbolView;
}(Component));
export default PartSymbolView;
//# sourceMappingURL=implAttributes_partSymbolView.js.map