"use strict";
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
    }
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var musicxml_interfaces_1 = require("musicxml-interfaces");
var react_1 = require("react");
var DOM = __importStar(require("react-dom-factories"));
var PropTypes = __importStar(require("prop-types"));
var lodash_1 = require("lodash");
var private_views_dot_1 = __importDefault(require("./private_views_dot"));
var private_views_glyph_1 = __importDefault(require("./private_views_glyph"));
var private_smufl_1 = require("./private_smufl");
var implAttributes_accidentalView_1 = __importDefault(require("./implAttributes_accidentalView"));
var implChord_noteheadView_1 = __importDefault(require("./implChord_noteheadView"));
var $AccidentalView = react_1.createFactory(implAttributes_accidentalView_1.default);
var $Dot = react_1.createFactory(private_views_dot_1.default);
var $NoteheadView = react_1.createFactory(implChord_noteheadView_1.default);
var $Glyph = react_1.createFactory(private_views_glyph_1.default);
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
        var right = private_smufl_1.getRight(noteheadGlyph);
        var left = private_smufl_1.getLeft(noteheadGlyph);
        var hasParens = spec.notehead && spec.notehead.parentheses;
        return DOM.g(null, $NoteheadView({
            key: "h",
            notehead: noteheadGlyph,
            spec: {
                color: spec.color,
                defaultX: defaultX,
                defaultY: 0,
                type: spec.notehead ? spec.notehead.type : musicxml_interfaces_1.NoteheadType.Normal
            }
        }), spec.dots && spec.printDot !== false ? lodash_1.map(spec.dots, function (dot, idx) { return $Dot({
            fill: dot.color,
            key: "_1_" + idx,
            radius: 2.4,
            x: defaultX + right + 6 + 6 * idx,
            y: _this.context.originY - _this.props.spec.defaultY -
                (dot.defaultY + (dot.relativeY || 0))
        }); }) : null, this.props.spec.accidental ? $AccidentalView({
            key: "a",
            spec: this.props.spec.accidental,
            noteDefaultX: defaultX,
        }) : null, hasParens && $Glyph({
            glyphName: "noteheadParenthesisRight",
            fill: "black",
            y: this.context.originY - this.props.spec.defaultY,
            x: defaultX + right + 2
        }), hasParens && $Glyph({
            glyphName: "noteheadParenthesisLeft",
            fill: "black",
            y: this.context.originY - this.props.spec.defaultY,
            x: defaultX + left - 5
        })
        /* DOM.g */ );
    };
    NoteView.prototype.getChildContext = function () {
        return {
            originY: this.context.originY - this.props.spec.defaultY
        };
    };
    NoteView.childContextTypes = {
        originY: PropTypes.number.isRequired
    };
    NoteView.contextTypes = {
        originY: PropTypes.number.isRequired
    };
    return NoteView;
}(react_1.Component));
exports.default = NoteView;
//# sourceMappingURL=implChord_noteView.js.map