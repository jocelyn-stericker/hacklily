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
var invariant_1 = __importDefault(require("invariant"));
var private_views_line_1 = __importDefault(require("./private_views_line"));
var private_views_glyph_1 = __importDefault(require("./private_views_glyph"));
var private_smufl_1 = require("./private_smufl");
var $Line = react_1.createFactory(private_views_line_1.default);
var $Glyph = react_1.createFactory(private_views_glyph_1.default);
/**
 * Renders a stem based on a height decided in Note.
 */
var StemView = /** @class */ (function (_super) {
    __extends(StemView, _super);
    function StemView() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    StemView.prototype.render = function () {
        var _a = this.props, spec = _a.spec, notehead = _a.notehead, tremolo = _a.tremolo, width = _a.width;
        var defaultX = spec.defaultX, relativeX = spec.relativeX, defaultY = spec.defaultY, relativeY = spec.relativeY, color = spec.color;
        if (spec.type === musicxml_interfaces_1.StemType.Double) {
            return null;
        }
        var direction = spec.type === musicxml_interfaces_1.StemType.Up ? 1 : -1; // TODO: StemType.Double
        var lineXOffset = direction * -width / 2;
        var offset = private_smufl_1.getFontOffset(notehead, direction) || [0];
        var x = defaultX + (relativeX || (offset[0] * 10 + lineXOffset));
        invariant_1.default(isFinite(x), "Invalid x offset %s", x);
        var dY = this.props.bestHeight * direction;
        var elements = [];
        elements.push($Line({
            key: "s",
            stroke: color,
            strokeWidth: width,
            x1: x,
            x2: x,
            y1: this.context.originY - defaultY - (relativeY || 0) - offset[1] * 10,
            y2: this.context.originY - defaultY - (relativeY || 0) - offset[1] * 10 - dY
        }));
        if (tremolo) {
            elements.push($Glyph({
                key: "t",
                glyphName: "tremolo" + (tremolo.data || "1"),
                x: x,
                fill: "black",
                y: this.context.originY - defaultY - (relativeY || 0) - dY * 4 / 5
            }));
        }
        if (elements.length === 1) {
            return elements[0];
        }
        else {
            return DOM.g(null, elements);
        }
    };
    StemView.contextTypes = {
        originY: PropTypes.number.isRequired
    };
    return StemView;
}(react_1.Component));
exports.default = StemView;
//# sourceMappingURL=implChord_stemView.js.map