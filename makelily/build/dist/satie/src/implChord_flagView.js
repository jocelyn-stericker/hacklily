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
import React, { Component } from "react";
import * as PropTypes from "prop-types";
import Glyph from "./private_views_glyph";
import { getFontOffset } from "./private_smufl";
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
        var fontOffsetX = getFontOffset(this.glyphName(), dir)[0] * xscale;
        var noteOffsetX = getFontOffset(this.props.notehead, dir)[0] * xscale;
        var noteOffsetY = getFontOffset(this.props.notehead, dir)[1] * 10;
        return (React.createElement(Glyph, { fill: spec.color, glyphName: this.glyphName(), scale: this.props.isGrace ? 0.6 : 1.0, x: spec.defaultX +
                fontOffsetX * 10 +
                (dir === 1 ? noteOffsetX * 10 - this.props.stemWidth : 0), y: context.originY - spec.defaultY - noteOffsetY * 4 }));
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
        originY: PropTypes.number.isRequired,
    };
    return Flag;
}(Component));
export default Flag;
//# sourceMappingURL=implChord_flagView.js.map