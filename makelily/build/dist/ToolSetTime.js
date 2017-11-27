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
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
var aphrodite_1 = require("aphrodite");
var musicxml_interfaces_1 = require("musicxml-interfaces");
var React = require("react");
var satie_1 = require("./satie/src/satie");
var tabStyles_1 = require("./tabStyles");
var stdTime = [
    {
        beatTypes: [4],
        beats: ['4'],
        symbol: musicxml_interfaces_1.TimeSymbolType.Common,
        tsViewbox: '-32 -45 80 80',
    },
    {
        beatTypes: [2],
        beats: ['2'],
        symbol: musicxml_interfaces_1.TimeSymbolType.Cut,
        tsViewbox: '-32 -45 80 80',
    },
    {
        beatTypes: [4],
        beats: ['2'],
        tsViewbox: '-32 -45 80 80',
    },
    {
        beatTypes: [4],
        beats: ['4'],
        tsViewbox: '-32 -45 80 80',
    },
    {
        beatTypes: [2],
        beats: ['2'],
        tsViewbox: '-32 -45 80 80',
    },
    {
        beatTypes: [4],
        beats: ['3'],
        tsViewbox: '-32 -45 80 80',
    },
    {
        beatTypes: [8],
        beats: ['6'],
        tsViewbox: '-32 -45 80 80',
    },
    {
        beatTypes: [8],
        beats: ['9'],
        tsViewbox: '-32 -45 80 80',
    },
    {
        beatTypes: [8],
        beats: ['12'],
        tsViewbox: '-26 -45 80 80',
    },
];
function getInitialState(props) {
    var selectedTime = stdTime.findIndex(function (time) {
        return time.beatTypes[0] === props.time.beatTypes[0] &&
            time.beats[0] === props.time.beats[0];
    });
    if (selectedTime === -1) {
        selectedTime = -1;
    }
    return {
        selectedTime: selectedTime,
    };
}
/**
 * A tool which allows a time signature to be inserted.
 */
var ToolSetTime = /** @class */ (function (_super) {
    __extends(ToolSetTime, _super);
    function ToolSetTime() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.state = getInitialState(_this.props);
        _this.handleInsertLyClicked = function () {
            _this.props.onInsertLy(_this.generateLy());
        };
        return _this;
    }
    // tslint:disable-next-line max-func-body-length
    ToolSetTime.prototype.render = function () {
        var _this = this;
        var tsViews = stdTime.map(function (time, i) {
            var timeSpec = __assign({ defaultX: 0, defaultY: 0, relativeY: 0 }, time);
            var selected = i === _this.state.selectedTime;
            var className = aphrodite_1.css(tabStyles_1.default.selectableOption, selected && tabStyles_1.default.selectableSelected, tabStyles_1.default.paletteSml);
            return (React.createElement("span", { className: className, role: "button", onClick: function () { return _this.setState({ selectedTime: i }); }, key: i },
                React.createElement("svg", { className: aphrodite_1.css(tabStyles_1.default.resetFont), viewBox: timeSpec.tsViewbox },
                    React.createElement(satie_1.Addons.TimeSignature, { spec: timeSpec }))));
        });
        return (React.createElement("div", { className: aphrodite_1.css(tabStyles_1.default.tool) },
            React.createElement("div", { className: aphrodite_1.css(tabStyles_1.default.section) },
                React.createElement("h3", { className: aphrodite_1.css(tabStyles_1.default.toolHeading) }, "Time Signature"),
                React.createElement("div", { className: aphrodite_1.css(tabStyles_1.default.selectableList) }, tsViews)),
            React.createElement("div", { className: aphrodite_1.css(tabStyles_1.default.spacer) }),
            React.createElement("div", { className: aphrodite_1.css(tabStyles_1.default.section) },
                React.createElement("pre", { className: aphrodite_1.css(tabStyles_1.default.lyPreview) }, this.generateLy()),
                React.createElement("button", { className: aphrodite_1.css(tabStyles_1.default.insert), onClick: this.handleInsertLyClicked }, "Insert this code into Hacklily"))));
    };
    ToolSetTime.prototype.generateLy = function () {
        var time = stdTime[this.state.selectedTime];
        var isNumeric = time.symbol == null;
        return (isNumeric ? '\\numericTimeSignature' : '\\defaultTimeSignature') + "\n\\time " + time.beats[0] + "/" + time.beatTypes[0];
    };
    return ToolSetTime;
}(React.Component));
exports.default = ToolSetTime;
//# sourceMappingURL=ToolSetTime.js.map