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
import React, { Component } from "react";
import * as PropTypes from "prop-types";
import Line from "./private_views_line";
import { bboxes } from "./private_smufl";
/**
 * Renders a ledger line at (x, y + line).
 */
var LedgerLine = /** @class */ (function (_super) {
    __extends(LedgerLine, _super);
    function LedgerLine() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    LedgerLine.prototype.render = function () {
        var spec = this.props.spec;
        var west = bboxes[this.props.notehead][3];
        var east = bboxes[this.props.notehead][0];
        var xOffset = (east - west) * 10;
        return (React.createElement(Line, { stroke: spec.color, strokeWidth: 2.2, 
            // Ledger lines should be thicker than regular lines.
            x1: spec.defaultX + (spec.relativeX || 0) - 3.2, x2: spec.defaultX + (spec.relativeX || 0) + xOffset - 0.2, y1: this.context.originY - spec.defaultY - (spec.relativeX || 0), y2: this.context.originY - spec.defaultY - (spec.relativeX || 0) }));
    };
    LedgerLine.contextTypes = {
        originY: PropTypes.number.isRequired,
    };
    return LedgerLine;
}(Component));
export default LedgerLine;
//# sourceMappingURL=implChord_ledgerLineView.js.map