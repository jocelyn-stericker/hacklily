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
import * as React from "react";
import { StemType } from "musicxml-interfaces";
import { Component } from "react";
import * as PropTypes from "prop-types";
import invariant from "invariant";
import Line from "./private_views_line";
import Glyph from "./private_views_glyph";
import { getFontOffset } from "./private_smufl";
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
        if (spec.type === StemType.Double) {
            return null;
        }
        var direction = spec.type === StemType.Up ? 1 : -1; // TODO: StemType.Double
        var lineXOffset = (direction * -width) / 2;
        var offset = getFontOffset(notehead, direction) || [0];
        var x = defaultX + (relativeX || offset[0] * 10 + lineXOffset);
        invariant(isFinite(x), "Invalid x offset %s", x);
        var dY = this.props.bestHeight * direction;
        var elements = [];
        elements.push(React.createElement(Line, { key: "s", stroke: color, strokeWidth: width, x1: x, x2: x, y1: this.context.originY - defaultY - (relativeY || 0) - offset[1] * 10, y2: this.context.originY -
                defaultY -
                (relativeY || 0) -
                offset[1] * 10 -
                dY }));
        if (tremolo) {
            elements.push(React.createElement(Glyph, { key: "t", glyphName: "tremolo" + (tremolo.data || "1"), x: x, fill: "black", y: this.context.originY - defaultY - (relativeY || 0) - (dY * 4) / 5 }));
        }
        if (elements.length === 1) {
            return elements[0];
        }
        else {
            return React.createElement("g", null, elements);
        }
    };
    StemView.contextTypes = {
        originY: PropTypes.number.isRequired,
    };
    return StemView;
}(Component));
export default StemView;
//# sourceMappingURL=implChord_stemView.js.map