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
var react_1 = require("react");
var DOM = require("react-dom-factories");
var PropTypes = require("prop-types");
var lodash_1 = require("lodash");
var invariant = require("invariant");
var private_views_dot_1 = require("./private_views_dot");
var private_views_glyph_1 = require("./private_views_glyph");
var private_smufl_1 = require("./private_smufl");
var $Dot = react_1.createFactory(private_views_dot_1.default);
var $Glyph = react_1.createFactory(private_views_glyph_1.default);
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
        invariant(!!spec.rest, "Attempting to render a non-rest with Rest");
        var notehead = this.props.notehead;
        var x = spec.defaultX + (spec.relativeX || 0);
        var y = this.context.originY - (spec.defaultY + (spec.relativeY || 0));
        var dotOffset = private_smufl_1.bboxes[notehead][0] * 10 + 6;
        return DOM.g(null, $Glyph({
            fill: spec.color,
            glyphName: notehead,
            key: "R",
            x: x,
            y: y
        } /* Glyph */), rest.measure && this.props.multipleRest && DOM.text({
            className: "mmn_",
            fontWeight: "bold",
            fontSize: 48,
            textAnchor: "middle",
            x: x + private_smufl_1.bboxes[notehead][0] * 10 / 2,
            y: y - 30
        }, this.props.multipleRest.count // TODO: useSymbols
        /* DOM.text */ ), spec.dots && spec.printDot !== false ? lodash_1.map(spec.dots, function (dot, idx) { return $Dot({
            fill: dot.color,
            key: idx + "d",
            radius: 2.4,
            x: x + dotOffset + 6 * idx,
            y: y - (dot.defaultY + (dot.relativeY || 0))
            // y: y + (line - 3)*10 + (((line * 2) % 2) ? 0 : 5)
        } /* Dot */); }) : null
        /* DOM.g */ );
    };
    Rest.contextTypes = {
        originY: PropTypes.number.isRequired
    };
    return Rest;
}(react_1.Component));
exports.default = Rest;
//# sourceMappingURL=implChord_restView.js.map