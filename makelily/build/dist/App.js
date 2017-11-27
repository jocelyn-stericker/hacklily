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
Object.defineProperty(exports, "__esModule", { value: true });
var aphrodite_1 = require("aphrodite");
var React = require("react");
var Makelily_1 = require("./Makelily");
exports.QUERY_PROP_KEYS = [
    'clef',
    'defaultTool',
    'keySig',
    'singleTaskMode',
    'time',
];
/**
 * This renders a SPA which demos the makelily modal.
 */
var App = /** @class */ (function (_super) {
    __extends(App, _super);
    function App() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    App.prototype.render = function () {
        var _a = this.props, clef = _a.clef, defaultTool = _a.defaultTool, keySig = _a.keySig, singleTaskMode = _a.singleTaskMode, setQuery = _a.setQuery, time = _a.time;
        return (React.createElement("div", { className: aphrodite_1.css(styles.appRoot) },
            React.createElement("div", { className: aphrodite_1.css(styles.mockPreview) }),
            React.createElement("div", { className: aphrodite_1.css(styles.mockHeader) }),
            React.createElement("div", { className: aphrodite_1.css(styles.presets) },
                "Makelily sandbox.",
                ' \u00a0',
                "\\clef",
                ' ',
                React.createElement("input", { onChange: function (ev) { return setQuery({ clef: ev.target.value }, true); }, value: clef || '' }),
                ' ',
                "\\key",
                ' ',
                React.createElement("input", { onChange: function (ev) { return setQuery({ keySig: ev.target.value }, true); }, value: keySig || '' }),
                ' ',
                "\\time",
                ' ',
                React.createElement("input", { onChange: function (ev) { return setQuery({ time: ev.target.value }, true); }, value: time || '' }),
                ' ',
                React.createElement("input", { id: "single-task-mode", onChange: function (ev) { return setQuery({ singleTaskMode: ev.target.checked }, true); }, type: "checkbox", checked: String(singleTaskMode) === 'true', "aria-checked": singleTaskMode }),
                React.createElement("label", { htmlFor: "single-task-mode" }, "Single task mode"),
                ' ',
                "default tool",
                ' ',
                React.createElement("input", { onChange: function (ev) { return setQuery({ defaultTool: ev.target.value }, true); }, value: defaultTool || '' })),
            React.createElement(Makelily_1.default, { clef: clef || '', defaultTool: defaultTool || '', keySig: keySig || '', time: time || '', singleTaskMode: String(singleTaskMode) === 'true', onHide: function () { return window.location.reload(); }, onInsertLy: this.handleInsertLy })));
    };
    App.prototype.handleInsertLy = function (ly) {
        // tslint:disable-next-line no-console
        console.log(ly);
    };
    return App;
}(React.Component));
exports.default = App;
// tslint:disable-next-line typedef
var styles = aphrodite_1.StyleSheet.create({
    appRoot: {
        backgroundColor: '#1e1e1e',
        height: '100%',
        width: '100%',
    },
    mockHeader: {
        backgroundColor: '#efefef',
        borderBottom: '1px solid #000',
        height: 50,
        position: 'absolute',
        top: 0,
        width: '100%',
    },
    mockPreview: {
        backgroundColor: 'white',
        height: '100%',
        position: 'absolute',
        right: 0,
        width: '50%',
    },
    presets: {
        color: 'black',
        fontFamily: 'monospace',
        left: 20,
        position: 'absolute',
        top: 15,
        zIndex: 90000,
    },
});
//# sourceMappingURL=App.js.map