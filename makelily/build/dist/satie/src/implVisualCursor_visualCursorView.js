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
import Line from "./private_views_line";
var VisualCursorView = /** @class */ (function (_super) {
    __extends(VisualCursorView, _super);
    function VisualCursorView() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    VisualCursorView.prototype.render = function () {
        var layout = this.props.layout;
        var x = layout.x;
        var yTop = this.context.systemTop;
        var yBottom = this.context.systemBottom;
        var height = yTop - yBottom;
        return (React.createElement(Line, { stroke: "#428bca", strokeWidth: 2, x1: x - 4, x2: x - 4, y1: yTop + height * 0.5, y2: yBottom - height * 0.5 }));
    };
    VisualCursorView.contextTypes = {
        originY: PropTypes.number.isRequired,
        systemBottom: PropTypes.number.isRequired,
        systemTop: PropTypes.number.isRequired,
    };
    return VisualCursorView;
}(Component));
export default VisualCursorView;
//# sourceMappingURL=implVisualCursor_visualCursorView.js.map