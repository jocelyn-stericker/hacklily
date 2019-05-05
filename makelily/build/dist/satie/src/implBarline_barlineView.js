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
var musicxml_interfaces_1 = require("musicxml-interfaces");
var react_1 = require("react");
var PropTypes = __importStar(require("prop-types"));
var lodash_1 = require("lodash");
var private_views_line_1 = __importDefault(require("./private_views_line"));
var implAttributes_attributesView_1 = __importDefault(require("./implAttributes_attributesView"));
/**
 * Renders a full-stave-height barline at (x,y).
 * Does not do any interesting calculations.
 */
var BarlineView = /** @class */ (function (_super) {
    __extends(BarlineView, _super);
    function BarlineView() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    BarlineView.prototype.render = function () {
        var originY = this.context.originY;
        var layout = this.props.layout;
        var model = layout.model;
        var x = model.defaultX;
        var y = originY - model.defaultY;
        // TODO: render BarStyleType.Dashed:
        // TODO: render BarStyleType.Dotted:
        // TODO: render BarStyleType.Short:
        // TODO: render BarStyleType.Tick:
        var yTop;
        var yBottom;
        if ((layout.partSymbol && layout.partSymbol.type !== musicxml_interfaces_1.PartSymbolType.None) ||
            (layout.partGroups &&
                lodash_1.some(layout.partGroups, function (group) { return group.groupBarline; }))) {
            yTop = this.context.systemTop;
            yBottom = this.context.systemBottom;
        }
        else {
            yTop = y - layout.height - layout.yOffset;
            yBottom = y + layout.height - layout.yOffset;
        }
        if (model.satieAttributes) {
            model.satieAttributes.overrideX =
                layout.overrideX + model.satieAttribsOffset;
        }
        return (React.createElement("g", null,
            lodash_1.map(layout.lineStarts, function (start, idx) { return (React.createElement(private_views_line_1.default, { key: idx, stroke: model.barStyle.color, strokeWidth: layout.lineWidths[idx], x1: x + start + layout.lineWidths[idx] / 2, x2: x + start + layout.lineWidths[idx] / 2, y1: yTop, y2: yBottom })); }),
            model.satieAttributes && (React.createElement(implAttributes_attributesView_1.default, { layout: model.satieAttributes }))));
    };
    BarlineView.contextTypes = {
        originY: PropTypes.number.isRequired,
        systemBottom: PropTypes.number.isRequired,
        systemTop: PropTypes.number.isRequired,
    };
    return BarlineView;
}(react_1.Component));
exports.default = BarlineView;
//# sourceMappingURL=implBarline_barlineView.js.map