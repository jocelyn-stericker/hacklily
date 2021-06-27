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
import { Component } from "react";
import * as PropTypes from "prop-types";
import invariant from "invariant";
import Glyph from "./private_views_glyph";
import { accidentalGlyphs } from "./private_chordUtil";
import { bboxes } from "./private_smufl";
var AccidentalView = /** @class */ (function (_super) {
    __extends(AccidentalView, _super);
    function AccidentalView() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    AccidentalView.prototype.render = function () {
        var spec = this.props.spec;
        var glyphName = accidentalGlyphs[this.props.spec.accidental];
        invariant(glyphName in bboxes, "Expected a glyph, got %s", glyphName);
        var originY = this.context.originY || 0;
        var shift = spec.parentheses ? 4 : 0;
        var y = originY - (spec.defaultY + (spec.relativeY || 0));
        invariant(!isNaN(y), "Invalid accidental y-position");
        var accidental = (React.createElement(Glyph, { fill: spec.color, glyphName: glyphName, x: (this.props.noteDefaultX || 0) +
                spec.defaultX +
                (spec.relativeX || 0) +
                shift, y: y }));
        if (spec.parentheses || spec.bracket) {
            var width = bboxes[glyphName][0] * 10; // TODO: it's actually 2 - 0!
            return (React.createElement("g", null,
                React.createElement(Glyph, { fill: "#000000", glyphName: "accidentalParensLeft", x: (this.props.noteDefaultX || 0) +
                        spec.defaultX +
                        (spec.relativeX || 0) -
                        7 +
                        shift, y: originY - (spec.defaultY + (spec.relativeY || 0)) }),
                accidental,
                React.createElement(Glyph, { fill: "#000000", glyphName: "accidentalParensRight", x: (this.props.noteDefaultX || 0) +
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
}(Component));
export default AccidentalView;
//# sourceMappingURL=implAttributes_accidentalView.js.map