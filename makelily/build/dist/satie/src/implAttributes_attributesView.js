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
import BarNumber from "./implAttributes_barNumberView";
import Clef from "./implAttributes_clefView";
import PartSymbol from "./implAttributes_partSymbolView";
import KeySignature from "./implAttributes_keySignatureView";
import TimeSignature from "./implAttributes_timeSignatureView";
import StaffLines from "./implAttributes_staffLinesView";
var AttributesView = /** @class */ (function (_super) {
    __extends(AttributesView, _super);
    function AttributesView() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    AttributesView.prototype.render = function () {
        var layout = this.props.layout;
        var children = [];
        // Staff lines go first, because they are underneath other attributes
        var staffWidth = layout.staffWidth;
        var staffLinesOffsetX = layout.staffLinesOffsetX;
        if (staffWidth) {
            children.push(React.createElement(StaffLines, { key: "staffLines", width: staffWidth, defaultX: this.props.layout.overrideX - staffLinesOffsetX, defaultY: 0, staffDetails: layout.staffDetails }));
        }
        if (layout.clef) {
            children.push(React.createElement(Clef, { key: "clef", spec: layout.clef }));
        }
        if (layout.keySignature) {
            children.push(React.createElement(KeySignature, { clef: layout.snapshotClef, key: "ks", spec: layout.keySignature }));
        }
        if (layout.time) {
            children.push(React.createElement(TimeSignature, { key: "ts", spec: layout.time }));
        }
        if (layout.measureNumberVisible) {
            children.push(React.createElement(BarNumber, { barNumber: layout.measureNumberVisible, key: "measure", spec: {
                    defaultX: 0,
                    defaultY: 30,
                } }));
        }
        if (layout.partSymbol) {
            children.push(React.createElement(PartSymbol, { key: "partSymbol", spec: layout.partSymbol }));
        }
        return React.createElement("g", null, children);
    };
    AttributesView.contextTypes = {
        originY: PropTypes.number.isRequired,
    };
    return AttributesView;
}(Component));
export default AttributesView;
//# sourceMappingURL=implAttributes_attributesView.js.map