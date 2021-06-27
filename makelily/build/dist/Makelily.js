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
import { css, StyleSheet } from "aphrodite";
import React from "react";
import { Application, requireFont } from "./satie/src/satie";
import ToolError from "./ToolError";
import ToolNoteEdit from "./ToolNoteEdit";
import ToolNotFound from "./ToolNotFound";
import ToolSetClef from "./ToolSetClef";
import ToolSetKey from "./ToolSetKey";
import ToolSetTime from "./ToolSetTime";
import { parseClef, parseKeySig, parseTime } from "./parseLy";
export var satieApplication = new Application({
    preloadedFonts: ["Alegreya", "Alegreya (bold)"],
    satieRoot: location.protocol + "//" + location.host + "/vendor/",
});
requireFont("Bravura", "root://bravura/otf/Bravura.otf");
var modes = [
    {
        Component: ToolSetClef,
        key: "clef",
        name: "Set Clef",
    },
    {
        Component: ToolSetKey,
        key: "key",
        name: "Set Key Signature",
    },
    {
        Component: ToolSetTime,
        key: "time",
        name: "Set Time Signature",
    },
    {
        Component: ToolNoteEdit,
        key: "notes",
        name: "Insert Notes",
    },
    {
        Component: ToolError,
        key: "error",
        name: null,
    },
];
/**
 * A modal which provides UIs for inserting LilyPond.
 */
var Makelily = /** @class */ (function (_super) {
    __extends(Makelily, _super);
    function Makelily() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.state = {
            toolKey: _this.props.defaultTool || "clef",
        };
        _this.handleDocumentKeyDown = function (e) {
            if (e.keyCode === 27) {
                e.preventDefault();
                _this.props.onHide();
            }
        };
        return _this;
    }
    Makelily.prototype.componentDidCatch = function (error, info) {
        console.warn("Caught error", error, info);
        this.setState({
            toolKey: "error",
        });
    };
    Makelily.prototype.componentDidMount = function () {
        document.addEventListener("keydown", this.handleDocumentKeyDown);
    };
    Makelily.prototype.componentWillUnmount = function () {
        document.removeEventListener("keydown", this.handleDocumentKeyDown);
    };
    Makelily.prototype.render = function () {
        var _this = this;
        var modeElements = modes
            .filter(function (mode) { return mode.name !== null; })
            .map(function (mode, i) {
            var className = css(styles.modeItem, i + 1 === modes.length && styles.modeItemLast, mode.key === _this.state.toolKey && styles.modeItemSelected);
            return (React.createElement("li", { className: className, onClick: function () { return _this.setState({ toolKey: mode.key }); }, role: "button", key: mode.key }, mode.name));
        });
        var activeMode = modes.find(function (mode) { return mode.key === _this.state.toolKey; });
        var Tool = activeMode
            ? activeMode.Component
            : ToolNotFound;
        var bar;
        if (!this.props.singleTaskMode) {
            bar = (React.createElement("div", { className: css(styles.modeBar) },
                React.createElement("h2", { className: css(styles.heading) }, "LilyPond Tools"),
                React.createElement("ul", { className: css(styles.modeList) }, modeElements)));
        }
        var contentClass = css(styles.content, this.props.singleTaskMode && styles.contentNoBar);
        return (React.createElement("span", null,
            React.createElement("div", { role: "button", "aria-label": "close", className: css(styles.modalBg), onClick: this.props.onHide }),
            React.createElement("div", { className: css(styles.modal) },
                bar,
                React.createElement("div", { className: contentClass },
                    React.createElement(Tool, { clef: parseClef(this.props.clef), keySig: parseKeySig(this.props.keySig), time: parseTime(this.props.time), onInsertLy: this.props.onInsertLy })),
                React.createElement("a", { href: "#", onClick: this.props.onHide, role: "button", className: css(styles.close) }, "\u00d7"))));
    };
    return Makelily;
}(React.Component));
export default Makelily;
var modeBarWidth = 180;
var styles = StyleSheet.create({
    close: {
        ":hover": {
            color: "black",
        },
        color: "#6e6e6e",
        fontSize: 22,
        position: "absolute",
        right: 15,
        textDecoration: "none",
        top: 22,
    },
    content: {
        bottom: 0,
        left: modeBarWidth,
        position: "absolute",
        right: 0,
        top: 0,
    },
    contentNoBar: {
        left: 0,
    },
    heading: {
        cursor: "default",
        fontSize: 18,
        marginBottom: 0,
        marginTop: 8,
        paddingBottom: 16,
        paddingLeft: 16,
        paddingTop: 16,
    },
    modal: {
        background: "white",
        border: "1px solid grey",
        borderRadius: 4,
        height: 600,
        left: "calc(50% - 1020px / 2)",
        overflow: "hidden",
        position: "fixed",
        top: "calc((50% - 600px / 2) * 2 / 3)",
        width: 1020,
        zIndex: 1001,
    },
    modalBg: {
        background: "black",
        bottom: 0,
        cursor: "pointer",
        left: 0,
        opacity: 0.4,
        position: "fixed",
        right: 0,
        top: 0,
        zIndex: 1000,
    },
    modeBar: {
        backgroundColor: "#F6F7F7",
        bottom: 0,
        left: 0,
        position: "absolute",
        top: 0,
        width: modeBarWidth,
    },
    modeItem: {
        ":hover": {
            textDecoration: "underline",
        },
        borderTop: "1px solid #D6D8DA",
        cursor: "pointer",
        fontSize: 15,
        padding: "8px 16px",
    },
    modeItemLast: {
        borderBottom: "1px solid #D6D8DA",
    },
    modeItemSelected: {
        ":hover": {
            color: "black",
            textDecoration: "none",
        },
        cursor: "default",
        fontWeight: "bold",
    },
    modeList: {
        listStyleType: "none",
        margin: 0,
        padding: 0,
    },
});
//# sourceMappingURL=Makelily.js.map
