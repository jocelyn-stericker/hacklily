"use strict";
/**
 * @license
 * This file is part of Makelily.
 * Copyright (C) 2017 - present Joshua Netterfield <joshua@nettek.ca>
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
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var aphrodite_1 = require("aphrodite");
var React = require("react");
var tabStyles_1 = __importDefault(require("./tabStyles"));
/**
 * Placeholder for when an error was caught.
 */
var ToolError = /** @class */ (function (_super) {
    __extends(ToolError, _super);
    function ToolError() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ToolError.prototype.render = function () {
        return (React.createElement("span", { className: aphrodite_1.css(tabStyles_1.default.tool) },
            React.createElement("div", { className: aphrodite_1.css(tabStyles_1.default.section) },
                React.createElement("h3", { className: aphrodite_1.css(tabStyles_1.default.toolHeading) }, "It's not your fault*!")),
            React.createElement("div", { className: aphrodite_1.css(tabStyles_1.default.section) },
                "The tool you were using crashed, so it has been closed. Please",
                " ",
                React.createElement("a", { href: "https://github.com/hacklily/makelily/issues/new", target: "_blank", rel: "noopener noreferrer" }, "file an issue"),
                " ",
                "so I can try fixing it."),
            React.createElement("div", { className: aphrodite_1.css(tabStyles_1.default.section) }, "*if you are Joshua, it is probably your fault.")));
    };
    return ToolError;
}(React.Component));
exports.default = ToolError;
//# sourceMappingURL=ToolError.js.map