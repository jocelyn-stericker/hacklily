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
var react_1 = require("react");
var PropTypes = __importStar(require("prop-types"));
var private_views_glyph_1 = __importDefault(require("./private_views_glyph"));
var private_smufl_1 = require("./private_smufl");
var $Glyph = react_1.createFactory(private_views_glyph_1.default);
/**
 * Responsible for rendering the "flag" on un-beamed notes shorter than quarter notes.
 */
var Flag = /** @class */ (function (_super) {
    __extends(Flag, _super);
    function Flag() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Flag.prototype.render = function () {
        var spec = this.props.spec;
        var context = this.context;
        var xscale = this.props.isGrace ? 0.6 : 1.0;
        var dir = spec.direction;
        var fontOffsetX = private_smufl_1.getFontOffset(this.glyphName(), dir)[0] * xscale;
        var noteOffsetX = private_smufl_1.getFontOffset(this.props.notehead, dir)[0] * xscale;
        var noteOffsetY = private_smufl_1.getFontOffset(this.props.notehead, dir)[1] * 10;
        return $Glyph({
            fill: spec.color,
            glyphName: this.glyphName(),
            scale: this.props.isGrace ? 0.6 : 1.0,
            x: spec.defaultX +
                fontOffsetX * 10 +
                ((dir === 1) ? noteOffsetX * 10 - this.props.stemWidth : 0),
            y: context.originY - spec.defaultY - noteOffsetY * 4
        });
    };
    Flag.prototype.directionString = function () {
        if (this.props.spec.direction === 1) {
            return "Up";
        }
        else if (this.props.spec.direction === -1) {
            return "Down";
        }
        throw new Error("Invalid direction");
    };
    Flag.prototype.glyphName = function () {
        return this.props.spec.flag + this.directionString();
    };
    Flag.contextTypes = {
        originY: PropTypes.number.isRequired
    };
    return Flag;
}(react_1.Component));
exports.default = Flag;
//# sourceMappingURL=implChord_flagView.js.map