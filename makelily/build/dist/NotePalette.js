"use strict";
/**
 * @license
 * This file is part of Makelily
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
var lodash_1 = require("lodash");
var musicxml_interfaces_1 = require("musicxml-interfaces");
var React = require("react");
var satie_1 = require("./satie/src/satie");
var dynamics = [
    {
        directionTypes: [{
                dynamics: {
                    ppp: true,
                },
            }],
    },
    {
        directionTypes: [{
                dynamics: {
                    pp: true,
                },
            }],
    },
    {
        directionTypes: [{
                dynamics: {
                    p: true,
                },
            }],
    },
    {
        directionTypes: [{
                dynamics: {
                    mp: true,
                },
            }],
    },
    {
        directionTypes: [{
                dynamics: {
                    mf: true,
                },
            }],
    },
    {
        directionTypes: [{
                dynamics: {
                    f: true,
                },
            }],
    },
    {
        directionTypes: [{
                dynamics: {
                    ff: true,
                },
            }],
    },
    {
        directionTypes: [{
                dynamics: {
                    fff: true,
                },
            }],
    },
    {
        directionTypes: [{
                dynamics: {
                    fp: true,
                },
            }],
    },
    {
        directionTypes: [{
                dynamics: {
                    sf: true,
                },
            }],
    },
    {
        directionTypes: [{
                dynamics: {
                    sfz: true,
                },
            }],
    },
    {
        directionTypes: [{
                dynamics: {
                    sfp: true,
                },
            }],
    },
    {
        directionTypes: [{
                dynamics: {
                    rfz: true,
                },
            }],
    },
];
var articulations = [
    {
        fermatas: [
            {
                shape: musicxml_interfaces_1.NormalAngledSquare.Normal,
            },
        ],
    },
    {
        fermatas: [
            {
                shape: musicxml_interfaces_1.NormalAngledSquare.Angled,
            },
        ],
    },
    {
        fermatas: [
            {
                shape: musicxml_interfaces_1.NormalAngledSquare.Square,
            },
        ],
    },
    {
        articulations: [
            {
                accent: {},
            },
        ],
    },
    {
        articulations: [
            {
                staccato: {},
            },
        ],
    },
    {
        articulations: [
            {
                staccatissimo: {},
            },
        ],
    },
    {
        articulations: [
            {
                tenuto: {},
            },
        ],
    },
    {
        articulations: [
            {
                staccato: {},
                tenuto: {},
            },
        ],
    },
    {
        articulations: [
            {
                accent: {},
                staccato: {},
            },
        ],
    },
    {
        articulations: [
            {
                strongAccent: {},
            },
        ],
    },
    {
        technicals: [
            {
                harmonic: {
                    artificial: false,
                    basePitch: null,
                    natural: true,
                    soundingPitch: null,
                    touchingPitch: null,
                },
            },
        ],
    },
    {
        technicals: [
            {
                stopped: {},
            },
        ],
    },
    {
        technicals: [
            {
                snapPizzicato: {},
            },
        ],
    },
    {
        technicals: [
            {
                upBow: {},
            },
        ],
    },
    {
        technicals: [
            {
                downBow: {},
            },
        ],
    },
];
/**
 * Renders a list of tools that can be selected in the note editor.
 */
var NotePalette = /** @class */ (function (_super) {
    __extends(NotePalette, _super);
    function NotePalette() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.setAccidentalF = function () { return _this.props.setAccidental(musicxml_interfaces_1.MxmlAccidental.Flat); };
        _this.setAccidentalNone = function () { return _this.props.setAccidental(musicxml_interfaces_1.MxmlAccidental.Natural); };
        _this.setAccidentalS = function () { return _this.props.setAccidental(musicxml_interfaces_1.MxmlAccidental.Sharp); };
        _this.setNote1 = function () { return _this.props.setNote(musicxml_interfaces_1.Count.Whole); };
        _this.setNote16 = function () { return _this.props.setNote(musicxml_interfaces_1.Count._16th); };
        _this.setNote2 = function () { return _this.props.setNote(musicxml_interfaces_1.Count.Half); };
        _this.setNote32 = function () { return _this.props.setNote(musicxml_interfaces_1.Count._32nd); };
        _this.setNote4 = function () { return _this.props.setNote(musicxml_interfaces_1.Count.Quarter); };
        _this.setNote8 = function () { return _this.props.setNote(musicxml_interfaces_1.Count.Eighth); };
        _this.setTypeN = function () { return _this.props.setEditType('N'); };
        _this.setTypeP = function () { return _this.props.setEditType('P'); };
        _this.setTypeR = function () { return _this.props.setEditType('R'); };
        _this.toggleDots = function () { return _this.props.setDots(((_this.props.dots || 0) + 1) % 4); };
        _this.toggleTuplet = function () {
            _this.props.setTimeModification(_this.props.timeModification ? null : { actualNotes: 3, normalNotes: 2 });
        };
        return _this;
    }
    NotePalette.prototype.render = function () {
        var cls = aphrodite_1.css(styles.paletteSml, styles.paletteBtnOff, styles.paletteTxt);
        return (React.createElement("div", { className: aphrodite_1.css(styles.controlWidget) },
            this.renderSecondRow(),
            React.createElement("div", { className: aphrodite_1.css(styles.controlRow) },
                this.renderDuration(),
                this.renderModifiers(),
                this.renderAccidentals(),
                React.createElement("div", { className: aphrodite_1.css(styles.spring) }),
                React.createElement("ul", { className: aphrodite_1.css(styles.controls) },
                    React.createElement("div", { className: aphrodite_1.css(styles.controlSeperator) }),
                    React.createElement("a", { href: "#", onClick: this.props.undo, className: cls, role: "button" },
                        React.createElement("i", { className: "fa-undo fa" })),
                    React.createElement("div", { className: aphrodite_1.css(styles.controlSeperator) }),
                    React.createElement("a", { href: "#", onClick: this.props.redo, className: cls, role: "button" },
                        React.createElement("i", { className: "fa-undo fa-flip-horizontal fa" })),
                    React.createElement("div", { className: aphrodite_1.css(styles.controlSeperator) }),
                    React.createElement("a", { href: "#", onClick: this.props.newMeasure, className: cls, role: "button" },
                        React.createElement("i", { className: "fa-plus fa" }),
                        ' ',
                        "Add Bar")))));
    };
    NotePalette.prototype.shouldComponentUpdate = function (nextProps) {
        return !lodash_1.isEqual(nextProps, this.props);
    };
    NotePalette.prototype.renderAccidentals = function () {
        var _a = this.props, accidental = _a.accidental, editType = _a.editType;
        function classNameForAcc(otherAccidental) {
            return aphrodite_1.css(styles.paletteSml, accidental === otherAccidental && editType === 'N' ?
                styles.paletteBtnOn : styles.paletteBtnOff);
        }
        var getTypeClass = function (forType) {
            return aphrodite_1.css(styles.paletteSml, editType === forType ? styles.paletteBtnOn : styles.paletteBtnOff);
        };
        return (React.createElement("span", { className: aphrodite_1.css(styles.subsection) },
            React.createElement("div", { className: aphrodite_1.css(styles.controlSeperator) }),
            React.createElement("ul", { className: aphrodite_1.css(styles.controls) },
                React.createElement("a", { href: "#", onClick: this.setAccidentalNone, className: classNameForAcc(musicxml_interfaces_1.MxmlAccidental.Natural), role: "button" },
                    React.createElement("span", { className: aphrodite_1.css(styles.bravura) },
                        React.createElement("span", { className: "mn_" }, '\ue261'))),
                React.createElement("a", { href: "#", onClick: this.setAccidentalF, className: classNameForAcc(musicxml_interfaces_1.MxmlAccidental.Flat), role: "button" },
                    React.createElement("span", { className: aphrodite_1.css(styles.bravura) },
                        React.createElement("span", { className: "mn_" }, '\ue260'))),
                React.createElement("a", { href: "#", onClick: this.setAccidentalS, className: classNameForAcc(musicxml_interfaces_1.MxmlAccidental.Sharp), role: "button" },
                    React.createElement("span", { className: aphrodite_1.css(styles.bravura) },
                        React.createElement("span", { className: "mn_" }, '\ue262'))),
                React.createElement("a", { href: "#", onClick: this.props.editType === 'R' ? this.setTypeN : this.setTypeR, className: getTypeClass('R'), role: "button" },
                    React.createElement("span", { className: aphrodite_1.css(styles.bravura) },
                        React.createElement("span", { className: "mn_" }, '\ue4e6'))),
                React.createElement("a", { href: "#", onClick: this.props.editType === 'P' ? this.setTypeN : this.setTypeP, className: getTypeClass('P'), role: "button" },
                    React.createElement("span", { className: aphrodite_1.css(styles.bravura) },
                        React.createElement("span", { className: "mn_" }, '\ue52f'))),
                React.createElement("div", { className: aphrodite_1.css(styles.controlSeperator) }))));
    };
    NotePalette.prototype.renderArticulations = function () {
        var _a = this.props, editType = _a.editType, notation = _a.notation, setNotation = _a.setNotation;
        if (editType !== 'P') {
            return null;
        }
        var rows = lodash_1.chunk(articulations, 3).map(function (row, idx) {
            var columns = row.map(function (model, jdx) {
                var className = aphrodite_1.css(lodash_1.isEqual(notation, model) ? styles.paletteBtnOn : styles.paletteBtnOff);
                return (
                /* tslint:disable-next-line react-a11y-anchors */
                React.createElement("a", { href: "#", onClick: function () { return setNotation(model); }, key: jdx, className: className, role: "button" },
                    React.createElement(satie_1.Addons.NotationView, { spec: model })));
            });
            return (React.createElement("ul", { className: aphrodite_1.css(styles.controls), key: idx }, columns));
        });
        return (React.createElement("span", { className: aphrodite_1.css(styles.subsection) },
            React.createElement("div", { className: aphrodite_1.css(styles.controlSeperator) }),
            rows));
    };
    NotePalette.prototype.renderDuration = function () {
        var _this = this;
        var note = this.props.note;
        var classNameForCount = function (cnt) {
            return aphrodite_1.css(note === cnt && (_this.props.editType === 'N' || _this.props.editType === 'R') ?
                styles.paletteBtnOn :
                styles.paletteBtnOff);
        };
        return (React.createElement("span", { className: aphrodite_1.css(styles.subsection) },
            React.createElement("div", { className: aphrodite_1.css(styles.controlSeperator) }),
            React.createElement("ul", { className: aphrodite_1.css(styles.controls) },
                React.createElement("a", { href: "#", onClick: this.setNote32, className: classNameForCount(musicxml_interfaces_1.Count._32nd), role: "button" },
                    React.createElement("span", { className: aphrodite_1.css(styles.bravura) },
                        React.createElement("span", { className: "mn_" }, '\ud834\udd62'))),
                React.createElement("a", { href: "#", onClick: this.setNote16, className: classNameForCount(musicxml_interfaces_1.Count._16th), role: "button" },
                    React.createElement("span", { className: aphrodite_1.css(styles.bravura) },
                        React.createElement("span", { className: "mn_" }, '\ud834\udd61'))),
                React.createElement("a", { href: "#", onClick: this.setNote8, className: classNameForCount(musicxml_interfaces_1.Count.Eighth), role: "button" },
                    React.createElement("span", { className: aphrodite_1.css(styles.bravura) },
                        React.createElement("span", { className: "mn_" }, '\ud834\udd60')))),
            React.createElement("ul", { className: aphrodite_1.css(styles.controls) },
                React.createElement("a", { href: "#", onClick: this.setNote4, className: classNameForCount(musicxml_interfaces_1.Count.Quarter), role: "button" },
                    React.createElement("span", { className: aphrodite_1.css(styles.bravura) },
                        React.createElement("span", { className: "mn_" }, '\ud834\udd5f'))),
                React.createElement("a", { href: "#", onClick: this.setNote2, className: classNameForCount(musicxml_interfaces_1.Count.Half), role: "button" },
                    React.createElement("span", { className: aphrodite_1.css(styles.bravura) },
                        React.createElement("span", { className: "mn_" }, '\ud834\udd5e'))),
                React.createElement("a", { href: "#", onClick: this.setNote1, className: classNameForCount(musicxml_interfaces_1.Count.Whole), role: "button" },
                    React.createElement("span", { className: aphrodite_1.css(styles.bravura) },
                        React.createElement("span", { className: "mn_" }, '\ue0a2'))))));
    };
    NotePalette.prototype.renderDynamics = function () {
        var _a = this.props, direction = _a.direction, editType = _a.editType, setDirection = _a.setDirection;
        if (editType !== 'P') {
            return null;
        }
        var rows = lodash_1.chunk(dynamics, 3).map(function (row, idx) {
            var columns = row.map(function (model, jdx) {
                var className = aphrodite_1.css(lodash_1.isEqual(direction, model) ? styles.paletteBtnOn : styles.paletteBtnOff);
                var layout = {
                    model: model,
                    overrideX: 0,
                };
                return (
                /* tslint:disable-next-line react-a11y-anchors */
                React.createElement("a", { href: "#", onClick: function () { return setDirection(model); }, key: jdx, className: className, role: "button" },
                    React.createElement(satie_1.Addons.Direction, { layout: layout })));
            });
            return (React.createElement("ul", { className: aphrodite_1.css(styles.controls), key: idx }, columns));
        });
        return (React.createElement("span", { className: aphrodite_1.css(styles.subsection) },
            React.createElement("div", { className: aphrodite_1.css(styles.controlSeperator) }),
            rows));
    };
    NotePalette.prototype.renderModifiers = function () {
        var _a = this.props, dots = _a.dots, timeModification = _a.timeModification;
        var timeModificationTupletClassName = aphrodite_1.css(timeModification ? styles.paletteBtnOn : styles.paletteBtnOff);
        var dotEl = lodash_1.times(dots || 1, function (idx) {
            return (React.createElement("span", { style: { marginLeft: 3, display: 'inline-block' }, key: idx }, '\ue1e7'));
        });
        return (React.createElement("span", { className: aphrodite_1.css(styles.subsection) },
            React.createElement("div", { className: aphrodite_1.css(styles.controlSeperator) }),
            React.createElement("ul", { className: aphrodite_1.css(styles.controls) },
                React.createElement("a", { href: "#", onClick: this.toggleDots, className: dots ? aphrodite_1.css(styles.paletteBtnOn) : aphrodite_1.css(styles.paletteBtnOff), role: "button" },
                    React.createElement("span", { className: aphrodite_1.css(styles.bravura) },
                        React.createElement("span", { className: "mn_" },
                            '\ud834\udd5f',
                            dotEl))),
                React.createElement("a", { href: "#", onClick: this.toggleTuplet, className: timeModificationTupletClassName, role: "button" },
                    React.createElement("span", { className: aphrodite_1.css(styles.bravura) },
                        React.createElement("span", { className: "mn_" }, '\ue883'))))));
    };
    NotePalette.prototype.renderSecondRow = function () {
        if (this.props.editType === 'P') {
            return (React.createElement("span", null,
                React.createElement("div", { className: aphrodite_1.css(styles.controlRow) }, this.renderDynamics()),
                React.createElement("div", { className: aphrodite_1.css(styles.controlRow) }, this.renderArticulations())));
        }
        return null;
    };
    return NotePalette;
}(React.Component));
exports.default = NotePalette;
// tslint:disable-next-line typedef
var styles = aphrodite_1.StyleSheet.create({
    bravura: {
        fontSize: 22,
    },
    controlHeading: {
        display: 'block',
        fontSize: 10,
        height: 10,
        marginBottom: 2,
        textAlign: 'center',
        width: '100%',
    },
    controlWidget: {
        backgroundColor: 'white',
        borderBottom: '1px solid #bebebe',
        borderRight: '1px solid #bebebe',
        bottom: 165,
        display: 'flex',
        flexDirection: 'column',
        left: 15,
        position: 'absolute',
        right: 15,
    },
    controlRow: {
        borderTop: '1px solid #bebebe',
        display: 'flex',
        flexDirection: 'row',
        minHeight: 40,
        overflow: 'auto',
    },
    controlSeperator: {
        backgroundColor: '#bebebe',
        height: '100%',
        width: 1,
    },
    controls: {
        display: 'flex',
        listStyleType: 'none',
        margin: 0,
        paddingLeft: 0,
    },
    buttonBarSpacer: {
        width: 40,
    },
    paletteSml: {
        fontSize: 22,
    },
    paletteTxt: {
        lineHeight: '42px',
    },
    paletteBtnOn: {
        background: 'rgb(0, 42, 74)',
        borderBottom: 'none',
        borderBottomWidth: 0,
        borderRadius: 0,
        borderTopWidth: 0,
        color: 'white',
        cursor: 'pointer',
        display: 'block',
        fontSize: 14,
        height: 40,
        lineHeight: '36px',
        minWidth: 20,
        overflow: 'hidden',
        paddingLeft: 10,
        paddingRight: 10,
        textAlign: 'center',
        textDecoration: 'none',
    },
    paletteBtnOff: (_a = {},
        _a[':hover'] = {
            background: 'rgb(26, 68, 100)',
            color: 'white',
        },
        _a.background = '#f6f7f7',
        _a.borderBottom = 'none',
        _a.borderBottomWidth = 0,
        _a.borderRadius = 0,
        _a.borderTopWidth = 0,
        _a.color = 'rgb(0, 0, 238)',
        _a.cursor = 'pointer',
        _a.display = 'block',
        _a.fontSize = 14,
        _a.height = 40,
        _a.lineHeight = '36px',
        _a.minWidth = 20,
        _a.overflow = 'hidden',
        _a.paddingLeft = 10,
        _a.paddingRight = 10,
        _a.textAlign = 'center',
        _a.textDecoration = 'none',
        _a),
    spring: {
        flex: 1,
    },
    subsection: {
        display: 'flex',
    },
});
var _a;
//# sourceMappingURL=NotePalette.js.map