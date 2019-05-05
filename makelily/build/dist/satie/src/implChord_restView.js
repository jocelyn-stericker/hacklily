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
var React = __importStar(require("react"));
var react_1 = require("react");
var PropTypes = __importStar(require("prop-types"));
var lodash_1 = require("lodash");
var invariant_1 = __importDefault(require("invariant"));
var private_views_dot_1 = __importDefault(require("./private_views_dot"));
var private_views_glyph_1 = __importDefault(require("./private_views_glyph"));
var private_smufl_1 = require("./private_smufl");
/**
 * Renders a rest.
 */
var Rest = /** @class */ (function (_super) {
    __extends(Rest, _super);
    function Rest() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Rest.prototype.render = function () {
        var spec = this.props.spec;
        if (spec.printObject === false) {
            return null;
        }
        var rest = spec.rest;
        invariant_1.default(!!spec.rest, "Attempting to render a non-rest with Rest");
        var notehead = this.props.notehead;
        var x = spec.defaultX + (spec.relativeX || 0);
        var y = this.context.originY - (spec.defaultY + (spec.relativeY || 0));
        var dotOffset = private_smufl_1.bboxes[notehead][0] * 10 + 6;
        return (React.createElement("g", null,
            React.createElement(private_views_glyph_1.default, { fill: spec.color, glyphName: notehead, key: "R", x: x, y: y }),
            rest.measure &&
                this.props.multipleRest && (React.createElement("text", { className: "mmn_", fontWeight: "bold", fontSize: 48, textAnchor: "middle", x: x + (private_smufl_1.bboxes[notehead][0] * 10) / 2, y: y - 30 },
                this.props.multipleRest.count,
                " /*TODO: useSymbols*/")),
            spec.dots && spec.printDot !== false
                ? lodash_1.map(spec.dots, function (dot, idx) { return (React.createElement(private_views_dot_1.default, { fill: dot.color, key: idx + "d", radius: 2.4, x: x + dotOffset + 6 * idx, y: y - (dot.defaultY + (dot.relativeY || 0)) })); })
                : null));
    };
    Rest.contextTypes = {
        originY: PropTypes.number.isRequired,
    };
    return Rest;
}(react_1.Component));
exports.default = Rest;
//# sourceMappingURL=implChord_restView.js.map