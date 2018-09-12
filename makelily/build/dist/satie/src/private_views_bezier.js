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
    }
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
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
var DOM = __importStar(require("react-dom-factories"));
/**
 * Responsible for the rendering a bezier curve, such as a
 * slur or a tie.
 */
var Bezier = /** @class */ (function (_super) {
    __extends(Bezier, _super);
    function Bezier() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Bezier.prototype.render = function () {
        return DOM.path({
            d: ("M" +
                this.props.x1 + "," + this.props.y1 +
                "C" +
                this.props.x2 + "," + this.props.y2 + " " +
                this.props.x3 + "," + this.props.y3 + " " +
                this.props.x4 + "," + this.props.y4 + " " +
                "C" +
                this.props.x5 + "," + this.props.y5 + " " +
                this.props.x6 + "," + this.props.y6 + " " +
                this.props.x1 + "," + this.props.y1),
            fill: this.props.fill,
            stroke: this.props.stroke,
            strokeWidth: this.props.strokeWidth
        });
    };
    return Bezier;
}(react_1.Component));
exports.default = Bezier;
//# sourceMappingURL=private_views_bezier.js.map