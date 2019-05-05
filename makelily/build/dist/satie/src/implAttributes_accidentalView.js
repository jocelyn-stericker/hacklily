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
    };
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
var React = __importStar(require("react"));
var react_1 = require("react");
var PropTypes = __importStar(require("prop-types"));
var invariant_1 = __importDefault(require("invariant"));
var private_views_glyph_1 = __importDefault(require("./private_views_glyph"));
var private_chordUtil_1 = require("./private_chordUtil");
var private_smufl_1 = require("./private_smufl");
var AccidentalView = /** @class */ (function (_super) {
    __extends(AccidentalView, _super);
    function AccidentalView() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    AccidentalView.prototype.render = function () {
        var spec = this.props.spec;
        var glyphName = private_chordUtil_1.accidentalGlyphs[this.props.spec.accidental];
        invariant_1.default(glyphName in private_smufl_1.bboxes, "Expected a glyph, got %s", glyphName);
        var originY = this.context.originY || 0;
        var shift = spec.parentheses ? 4 : 0;
        var y = originY - (spec.defaultY + (spec.relativeY || 0));
        invariant_1.default(!isNaN(y), "Invalid accidental y-position");
        var accidental = (React.createElement(private_views_glyph_1.default, { fill: spec.color, glyphName: glyphName, x: (this.props.noteDefaultX || 0) +
                spec.defaultX +
                (spec.relativeX || 0) +
                shift, y: y }));
        if (spec.parentheses || spec.bracket) {
            var width = private_smufl_1.bboxes[glyphName][0] * 10; // TODO: it's actually 2 - 0!
            return (React.createElement("g", null,
                React.createElement(private_views_glyph_1.default, { fill: "#000000", glyphName: "accidentalParensLeft", x: (this.props.noteDefaultX || 0) +
                        spec.defaultX +
                        (spec.relativeX || 0) -
                        7 +
                        shift, y: originY - (spec.defaultY + (spec.relativeY || 0)) }),
                accidental,
                React.createElement(private_views_glyph_1.default, { fill: "#000000", glyphName: "accidentalParensRight", x: (this.props.noteDefaultX || 0) +
                        spec.defaultX +
                        (spec.relativeX || 0) +
                        width +
                        shift, y: originY - (spec.defaultY + (spec.relativeY || 0)) })));
        }
        else {
            return accidental;
        }
    };
    AccidentalView.contextTypes = {
        originY: PropTypes.number,
    };
    return AccidentalView;
}(react_1.Component));
exports.default = AccidentalView;
//# sourceMappingURL=implAttributes_accidentalView.js.map