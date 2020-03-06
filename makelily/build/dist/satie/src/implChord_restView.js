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
import { Component } from "react";
import * as PropTypes from "prop-types";
import { map } from "lodash";
import invariant from "invariant";
import Dot from "./private_views_dot";
import Glyph from "./private_views_glyph";
import { bboxes } from "./private_smufl";
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
        var dotOffset = bboxes[notehead][0] * 10 + 6;
        return (React.createElement("g", null,
            React.createElement(Glyph, { fill: spec.color, glyphName: notehead, key: "R", x: x, y: y }),
            rest.measure && this.props.multipleRest && (React.createElement("text", { className: "mmn_", fontWeight: "bold", fontSize: 48, textAnchor: "middle", x: x + (bboxes[notehead][0] * 10) / 2, y: y - 30 },
                this.props.multipleRest.count,
                " /*TODO: useSymbols*/")),
            spec.dots && spec.printDot !== false
                ? map(spec.dots, function (dot, idx) { return (React.createElement(Dot, { fill: dot.color, key: idx + "d", radius: 2.4, x: x + dotOffset + 6 * idx, y: y - (dot.defaultY + (dot.relativeY || 0)) })); })
                : null));
    };
    Rest.contextTypes = {
        originY: PropTypes.number.isRequired,
    };
    return Rest;
}(Component));
export default Rest;
//# sourceMappingURL=implChord_restView.js.map