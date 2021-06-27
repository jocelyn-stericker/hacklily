/**
 * @license
 * This file is part of Makelily.
 * Copyright (C) 2017 - present Jocelyn Stericker <jocelyn@nettek.ca>
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301  USA
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
import { css } from "aphrodite";
import React from "react";
import tabStyles from "./tabStyles";
/**
 * Placeholder for when a tool with an invalid name is requested.
 */
var ToolNotFound = /** @class */ (function (_super) {
    __extends(ToolNotFound, _super);
    function ToolNotFound() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ToolNotFound.prototype.render = function () {
        return React.createElement("span", { className: css(tabStyles.tool) }, "Tool not found.");
    };
    return ToolNotFound;
}(React.Component));
export default ToolNotFound;
//# sourceMappingURL=ToolNotFound.js.map