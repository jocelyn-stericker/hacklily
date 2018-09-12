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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var aphrodite_1 = require("aphrodite");
var React = require("react");
var satie_1 = require("./satie/src/satie");
var tabStyles_1 = __importDefault(require("./tabStyles"));
var stdClefs = [
    {
        clefViewbox: "-26 -47 80 114",
        enName: "Treble",
        line: 2,
        lyName: "treble",
        sign: "G",
    },
    {
        clefViewbox: "-26 -47 80 114",
        enName: "Bass",
        line: 4,
        lyName: "bass",
        sign: "F",
    },
    {
        clefViewbox: "-26 -47 80 114",
        enName: "Alto",
        line: 3,
        lyName: "alto",
        sign: "C",
    },
    {
        clefViewbox: "-26 -47 80 114",
        enName: "Tenor",
        line: 4,
        lyName: "tenor",
        sign: "C",
    },
    {
        clefViewbox: "-32 -47 80 114",
        enName: "Guitar Tab",
        line: 5,
        lyName: "moderntab",
        sign: "TAB",
    },
    {
        clefViewbox: "-32 -47 80 114",
        enName: "Perc.",
        line: 3,
        lyName: "percussion",
        sign: "percussion",
    },
];
function getInitialState(props) {
    var selectedClef = stdClefs.findIndex(function (clef) {
        return clef.line === props.clef.line && clef.sign === props.clef.sign;
    });
    if (selectedClef === -1) {
        selectedClef = 0;
    }
    return {
        octave: parseInt(props.clef.clefOctaveChange, 10) || 0,
        octaveOptional: false,
        selectedClef: selectedClef,
    };
}
/**
 * A tool which allows clefs to be inserted.
 */
var ToolSetClef = /** @class */ (function (_super) {
    __extends(ToolSetClef, _super);
    function ToolSetClef() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.state = getInitialState(_this.props);
        _this.handleInsertLyClicked = function () {
            _this.props.onInsertLy(_this.generateLy());
        };
        return _this;
    }
    // tslint:disable-next-line max-func-body-length
    ToolSetClef.prototype.render = function () {
        var _this = this;
        var clefViews = stdClefs.map(function (clef, i) {
            var clefSpec = __assign({ defaultX: 0, defaultY: 0, relativeY: 0 }, clef, { clefOctaveChange: clef.sign !== "TAB" &&
                    clef.sign !== "percussion" &&
                    "" + _this.state.octave });
            var selected = i === _this.state.selectedClef;
            return (React.createElement("span", { className: aphrodite_1.css(tabStyles_1.default.selectableOption, selected && tabStyles_1.default.selectableSelected), role: "button", onClick: function () { return _this.setState({ selectedClef: i }); }, key: i },
                React.createElement("svg", { className: aphrodite_1.css(tabStyles_1.default.resetFont), viewBox: clefSpec.clefViewbox },
                    React.createElement(satie_1.Addons.Clef, { spec: clefSpec })),
                React.createElement("span", { className: aphrodite_1.css(tabStyles_1.default.selectableDescription) }, clefSpec.enName)));
        });
        var clefSign = stdClefs[this.state.selectedClef].sign;
        var canChangeOctave = clefSign !== "TAB" && clefSign !== "percussion";
        return (React.createElement("div", { className: aphrodite_1.css(tabStyles_1.default.tool) },
            React.createElement("div", { className: aphrodite_1.css(tabStyles_1.default.section) },
                React.createElement("h3", { className: aphrodite_1.css(tabStyles_1.default.toolHeading) }, "Clef"),
                React.createElement("div", { className: aphrodite_1.css(tabStyles_1.default.selectableList) }, clefViews)),
            React.createElement("div", { className: aphrodite_1.css(tabStyles_1.default.section) },
                React.createElement("h3", { className: aphrodite_1.css(tabStyles_1.default.toolHeading) }, "Octave"),
                React.createElement("form", { className: aphrodite_1.css(tabStyles_1.default.radioGroup) },
                    React.createElement("div", null,
                        React.createElement("input", { id: "set-clef-15va", type: "radio", checked: this.state.octave === 2, "aria-checked": this.state.octave === 2, onChange: function () { return _this.setState({ octave: 2 }); } }),
                        React.createElement("label", { htmlFor: "set-clef-15va" }, "Play two octaves higher than written (15va)")),
                    React.createElement("div", null,
                        React.createElement("input", { id: "set-clef-8va", type: "radio", checked: this.state.octave === 1, disabled: !canChangeOctave, "aria-checked": this.state.octave === 1, onChange: function () { return _this.setState({ octave: 1 }); } }),
                        React.createElement("label", { htmlFor: "set-clef-8va" }, "Play an octave higher than written (8va)")),
                    React.createElement("div", null,
                        React.createElement("input", { id: "set-clef-0v", type: "radio", checked: this.state.octave === 0, disabled: !canChangeOctave, "aria-checked": this.state.octave === 0, onChange: function () { return _this.setState({ octave: 0 }); } }),
                        React.createElement("label", { htmlFor: "set-clef-0v" },
                            React.createElement("strong", null, "Play in standard octave."))),
                    React.createElement("div", null,
                        React.createElement("input", { id: "set-clef-8vb", type: "radio", checked: this.state.octave === -1, disabled: !canChangeOctave, "aria-checked": this.state.octave === -1, onChange: function () { return _this.setState({ octave: -1 }); } }),
                        React.createElement("label", { htmlFor: "set-clef-8vb" }, "Play an octave lower than written (8vb)")),
                    React.createElement("div", null,
                        React.createElement("input", { id: "set-clef-15vb", type: "radio", checked: this.state.octave === -2, disabled: !canChangeOctave, "aria-checked": this.state.octave === -2, onChange: function () { return _this.setState({ octave: -2 }); } }),
                        React.createElement("label", { htmlFor: "set-clef-15vb" }, "Play two octaves lower than written (15vb)")),
                    React.createElement("div", { style: { marginTop: 12 } },
                        React.createElement("input", { id: "clef-octave-optional", type: "checkbox", disabled: this.state.octave === 0 || !canChangeOctave, checked: this.state.octaveOptional, "aria-checked": this.state.octaveOptional, onChange: function () {
                                return _this.setState({ octaveOptional: !_this.state.octaveOptional });
                            } }),
                        React.createElement("label", { htmlFor: "clef-octave-optional" }, "Octave change is optional (in parentheses)")))),
            React.createElement("div", { className: aphrodite_1.css(tabStyles_1.default.spacer) }),
            React.createElement("div", { className: aphrodite_1.css(tabStyles_1.default.section) },
                React.createElement("pre", { className: aphrodite_1.css(tabStyles_1.default.lyPreview) }, this.generateLy()),
                React.createElement("button", { className: aphrodite_1.css(tabStyles_1.default.insert), onClick: this.handleInsertLyClicked }, "Insert this code into Hacklily"))));
    };
    ToolSetClef.prototype.generateLy = function () {
        var clef = stdClefs[this.state.selectedClef].lyName;
        if (clef === "moderntab" ||
            clef === "percussion" ||
            this.state.octave === 0) {
            return "\\clef " + clef;
        }
        var openOctave = this.state.octaveOptional ? "(" : "";
        var closeOctave = this.state.octaveOptional ? ")" : "";
        switch (this.state.octave) {
            case -2:
                return "\\clef \"" + clef + "_" + openOctave + "15" + closeOctave + "\"";
            case -1:
                return "\\clef \"" + clef + "_" + openOctave + "8" + closeOctave + "\"";
            case 1:
                return "\\clef \"" + clef + "^" + openOctave + "8" + closeOctave + "\"";
            case 2:
                return "\\clef \"" + clef + "^" + openOctave + "15" + closeOctave + "\"";
            default:
                return "Error: unknown octave";
        }
    };
    return ToolSetClef;
}(React.Component));
exports.default = ToolSetClef;
//# sourceMappingURL=ToolSetClef.js.map