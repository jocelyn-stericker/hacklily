"use strict";
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
var react_1 = require("react");
var DOM = require("react-dom-factories");
var PropTypes = require("prop-types");
var BarNumber = /** @class */ (function (_super) {
    __extends(BarNumber, _super);
    function BarNumber() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    BarNumber.prototype.render = function () {
        var spec = this.props.spec;
        return DOM.text({
            className: "bn_",
            fontSize: 24,
            x: spec.defaultX + (spec.relativeX || 0),
            y: this.context.originY - spec.defaultY - (spec.relativeY || 0)
        }, this.props.barNumber);
    };
    BarNumber.contextTypes = {
        originY: PropTypes.number.isRequired
    };
    return BarNumber;
}(react_1.Component));
exports.default = BarNumber;
//# sourceMappingURL=implAttributes_barNumberView.js.map