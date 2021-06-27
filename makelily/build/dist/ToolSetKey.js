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
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
import { css } from "aphrodite";
import React from "react";
import { Addons as SatieAddons } from "./satie/src/satie";
import tabStyles from "./tabStyles";
var keyViewbox = "-2 -40 80 80";
var trebleClef = {
    line: 2,
    sign: "G",
};
var majors = "cgdaebFCGDAEBfcgda";
function getEnglish(fifths, mode) {
    var englishMode = mode === "major" ? "major" : "minor";
    var key = majors[fifths + 7 + (mode === "minor" ? 3 : 0)];
    if (!key) {
        return "Unknown";
    }
    if (key.toLowerCase() === key) {
        if (fifths < 0) {
            // It's flat.
            return key.toUpperCase() + "\u266D " + englishMode;
        }
        else {
            return key.toUpperCase() + "\u266F " + englishMode;
        }
    }
    return key.toUpperCase() + " " + englishMode;
}
function getLy(fifths, mode) {
    var key = majors[fifths + 7 + (mode === "minor" ? 3 : 0)];
    if (!key) {
        return "Unknown";
    }
    if (key.toLowerCase() === key) {
        if (fifths < 0) {
            // It's flat.
            return "\\key " + key.toLowerCase() + "es \\" + mode;
        }
        else {
            return "\\key " + key.toLowerCase() + "is \\" + mode;
        }
    }
    return "\\key " + key.toLowerCase() + " \\" + mode;
}
var stdKeys = {
    major: Array(15)
        .fill(null)
        .map(function (_, i) { return ({
        fifths: i - 7,
        mode: "major",
    }); }),
    minor: Array(15)
        .fill(null)
        .map(function (_, i) { return ({
        fifths: i - 7,
        mode: "minor",
    }); }),
};
function getInitialState(props) {
    var selectedKey = 8;
    var selectedMode = "major";
    if (props.keySig.mode === "minor") {
        selectedMode = "minor";
    }
    selectedKey = parseInt(String(props.keySig.fifths), 10) + 7;
    return {
        selectedKey: selectedKey,
        selectedMode: selectedMode,
    };
}
/**
 * A tool which allows a key to be inserted.
 */
var ToolSetKey = /** @class */ (function (_super) {
    __extends(ToolSetKey, _super);
    function ToolSetKey() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.state = getInitialState(_this.props);
        _this.handleInsertLyClicked = function () {
            _this.props.onInsertLy(_this.generateLy());
        };
        return _this;
    }
    ToolSetKey.prototype.render = function () {
        var _this = this;
        var ksViews = stdKeys.major.map(function (key, i) {
            var keySpec = __assign({ defaultX: 0, defaultY: 0, relativeY: 0 }, key);
            var selected = i === _this.state.selectedKey;
            return (React.createElement("span", { className: css(tabStyles.selectableOption, selected && tabStyles.selectableSelected), role: "button", onClick: function () { return _this.setState({ selectedKey: i }); }, key: i },
                React.createElement("svg", { className: css(tabStyles.resetFont), viewBox: keyViewbox },
                    React.createElement(SatieAddons.KeySignature, { clef: trebleClef, spec: keySpec })),
                React.createElement("span", { className: css(tabStyles.selectableDescription) }, getEnglish(key.fifths, _this.state.selectedMode))));
        });
        return (React.createElement("div", { className: css(tabStyles.tool) },
            React.createElement("div", { className: css(tabStyles.section) },
                React.createElement("h3", { className: css(tabStyles.toolHeading) }, "Key Signature"),
                React.createElement("div", { className: css(tabStyles.selectableList) }, ksViews)),
            React.createElement("div", { className: css(tabStyles.section) },
                React.createElement("h3", { className: css(tabStyles.toolHeading) }, "Mode"),
                React.createElement("form", { className: css(tabStyles.radioGroup) },
                    React.createElement("div", null,
                        React.createElement("input", { id: "key-mode-major", type: "radio", checked: this.state.selectedMode === "major", "aria-checked": this.state.selectedMode === "major", onChange: function () { return _this.setState({ selectedMode: "major" }); } }),
                        React.createElement("label", { htmlFor: "key-mode-major" }, "Major (M)")),
                    React.createElement("div", null,
                        React.createElement("input", { id: "key-mode-minor", type: "radio", checked: this.state.selectedMode === "minor", "aria-checked": this.state.selectedMode === "minor", onChange: function () { return _this.setState({ selectedMode: "minor" }); } }),
                        React.createElement("label", { htmlFor: "key-mode-minor" }, "Minor (m)")))),
            React.createElement("div", { className: css(tabStyles.spacer) }),
            React.createElement("div", { className: css(tabStyles.section) },
                React.createElement("pre", { className: css(tabStyles.lyPreview) }, this.generateLy()),
                React.createElement("button", { className: css(tabStyles.insert), onClick: this.handleInsertLyClicked }, "Insert this code into Hacklily"))));
    };
    ToolSetKey.prototype.generateLy = function () {
        return getLy(stdKeys.major[this.state.selectedKey].fifths, this.state.selectedMode);
    };
    return ToolSetKey;
}(React.Component));
export default ToolSetKey;
//# sourceMappingURL=ToolSetKey.js.map