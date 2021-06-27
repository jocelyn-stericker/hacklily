/**
 * This file is part of Satie music engraver <https://github.com/emilyskidsister/satie>.
 * Copyright (C) Jocelyn Stericker <jocelyn@nettek.ca> 2015 - present.
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
import { NoteheadType } from "musicxml-interfaces";
import { Component } from "react";
import * as PropTypes from "prop-types";
import { map } from "lodash";
import Dot from "./private_views_dot";
import Glyph from "./private_views_glyph";
import { getLeft, getRight } from "./private_smufl";
import AccidentalView from "./implAttributes_accidentalView";
import NoteheadView from "./implChord_noteheadView";
var NoteView = /** @class */ (function (_super) {
    __extends(NoteView, _super);
    function NoteView() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    NoteView.prototype.render = function () {
        var _this = this;
        var spec = this.props.spec;
        if (spec.printObject === false) {
            return null;
        }
        var defaultX = this.props.defaultX || spec.defaultX;
        var noteheadGlyph = this.props.noteheadGlyph;
        var right = getRight(noteheadGlyph);
        var left = getLeft(noteheadGlyph);
        var hasParens = spec.notehead && spec.notehead.parentheses;
        return (React.createElement("g", null,
            React.createElement(NoteheadView, { key: "h", notehead: noteheadGlyph, spec: {
                    color: spec.color,
                    defaultX: defaultX,
                    defaultY: 0,
                    type: spec.notehead ? spec.notehead.type : NoteheadType.Normal,
                } }),
            spec.dots && spec.printDot !== false
                ? map(spec.dots, function (dot, idx) { return (React.createElement(Dot, { fill: dot.color, key: "_1_" + idx, radius: 2.4, x: defaultX + right + 6 + 6 * idx, y: _this.context.originY -
                        _this.props.spec.defaultY -
                        (dot.defaultY + (dot.relativeY || 0)) })); })
                : null,
            this.props.spec.accidental ? (React.createElement(AccidentalView, { key: "a", spec: this.props.spec.accidental, noteDefaultX: defaultX })) : null,
            hasParens && (React.createElement(Glyph, { glyphName: "noteheadParenthesisRight", fill: "black", y: this.context.originY - this.props.spec.defaultY, x: defaultX + right + 2 })),
            hasParens && (React.createElement(Glyph, { glyphName: "noteheadParenthesisLeft", fill: "black", y: this.context.originY - this.props.spec.defaultY, x: defaultX + left - 5 }))));
    };
    NoteView.prototype.getChildContext = function () {
        return {
            originY: this.context.originY - this.props.spec.defaultY,
        };
    };
    NoteView.childContextTypes = {
        originY: PropTypes.number.isRequired,
    };
    NoteView.contextTypes = {
        originY: PropTypes.number.isRequired,
    };
    return NoteView;
}(Component));
export default NoteView;
//# sourceMappingURL=implChord_noteView.js.map