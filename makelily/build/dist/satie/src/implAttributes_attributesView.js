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
var react_1 = require("react");
var DOM = require("react-dom-factories");
var PropTypes = require("prop-types");
var implAttributes_barNumberView_1 = require("./implAttributes_barNumberView");
var implAttributes_clefView_1 = require("./implAttributes_clefView");
var implAttributes_partSymbolView_1 = require("./implAttributes_partSymbolView");
var implAttributes_keySignatureView_1 = require("./implAttributes_keySignatureView");
var implAttributes_timeSignatureView_1 = require("./implAttributes_timeSignatureView");
var implAttributes_staffLinesView_1 = require("./implAttributes_staffLinesView");
var $StaffLines = react_1.createFactory(implAttributes_staffLinesView_1.default);
var $Clef = react_1.createFactory(implAttributes_clefView_1.default);
var $KeySignature = react_1.createFactory(implAttributes_keySignatureView_1.default);
var $TimeSignature = react_1.createFactory(implAttributes_timeSignatureView_1.default);
var $BarNumber = react_1.createFactory(implAttributes_barNumberView_1.default);
var $PartSymbol = react_1.createFactory(implAttributes_partSymbolView_1.default);
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
        if (!!staffWidth) {
            children.push($StaffLines({
                key: "staffLines",
                width: staffWidth,
                defaultX: this.props.layout.overrideX - staffLinesOffsetX,
                defaultY: 0,
                staffDetails: layout.staffDetails
            }));
        }
        if (layout.clef) {
            children.push($Clef({
                key: "clef",
                spec: layout.clef
            }));
        }
        if (layout.keySignature) {
            children.push($KeySignature({
                clef: layout.snapshotClef,
                key: "ks",
                spec: layout.keySignature
            }));
        }
        if (layout.time) {
            children.push($TimeSignature({
                key: "ts",
                spec: layout.time
            }));
        }
        if (!!layout.measureNumberVisible) {
            children.push($BarNumber({
                barNumber: layout.measureNumberVisible,
                key: "measure",
                spec: {
                    defaultX: 0,
                    defaultY: 30
                }
            }));
        }
        if (!!layout.partSymbol) {
            children.push($PartSymbol({
                key: "partSymbol",
                spec: layout.partSymbol
            }));
        }
        return DOM.g(null, children);
    };
    AttributesView.contextTypes = {
        originY: PropTypes.number.isRequired
    };
    return AttributesView;
}(react_1.Component));
exports.default = AttributesView;
//# sourceMappingURL=implAttributes_attributesView.js.map