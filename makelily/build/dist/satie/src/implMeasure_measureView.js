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
import { chain, flatten, mapValues, map, forEach } from "lodash";
import invariant from "invariant";
import { MAX_SAFE_INTEGER } from "./private_util";
import ModelView from "./implSegment_modelView";
var NUMBER_ARRAY = PropTypes.arrayOf(PropTypes.number);
var MeasureView = /** @class */ (function (_super) {
    __extends(MeasureView, _super);
    function MeasureView() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    MeasureView.prototype.render = function () {
        var _this = this;
        var layout = this.props.layout;
        return (React.createElement("g", { transform: "translate(" + layout.originX + ")" }, chain(flatten(layout.elements))
            .filter(function (layout) { return !!layout.model; }) // Remove helpers.
            .map(function (layout) { return (React.createElement(ModelView, { key: layout.key, version: _this.props.layout.getVersion(), layout: layout, originX: _this.props.layout.originX })); })
            .value()));
        /* TODO: lyric boxes */
        /* TODO: free boxes */
        /* TODO: slurs and ties */
    };
    MeasureView.prototype.getChildContext = function () {
        var _this = this;
        var layout = this.props.layout;
        var originYByPartAndStaff = mapValues(layout.originY, function (layouts) {
            return _this.extractOrigins(layouts);
        });
        var bottom = MAX_SAFE_INTEGER;
        var top = 0;
        forEach(layout.originY, function (origins) {
            forEach(origins, function (origin, staff) {
                if (!staff) {
                    return;
                }
                bottom = Math.min(origin, bottom);
                top = Math.max(origin, top);
            });
        });
        // TODO 1: Fix stave height
        // TODO 2: Do not ignore top/bottom staff in staffGroup of attributes
        // TODO 3: A part can be in many groups.
        return {
            originYByPartAndStaff: originYByPartAndStaff,
            systemBottom: this.context.originY - bottom + 20.5,
            systemTop: this.context.originY - top - 20.5,
        };
    };
    MeasureView.prototype.extractOrigins = function (layouts) {
        var _this = this;
        return map(layouts, function (layout) { return _this.invert(layout); });
    };
    MeasureView.prototype.invert = function (y) {
        return this.context.originY - y;
    };
    MeasureView.prototype.shouldComponentUpdate = function (nextProps) {
        invariant(!isNaN(this.props.version), "Invalid non-numeric version " + this.props.version);
        return (this.props.version !== nextProps.version ||
            this.props.layout.originX !== nextProps.layout.originX ||
            this.props.layout.width !== nextProps.layout.width);
    };
    MeasureView.childContextTypes = {
        originYByPartAndStaff: PropTypes.objectOf(NUMBER_ARRAY).isRequired,
        systemBottom: PropTypes.number.isRequired,
        systemTop: PropTypes.number.isRequired,
    };
    MeasureView.contextTypes = {
        originY: PropTypes.number,
    };
    return MeasureView;
}(Component));
export default MeasureView;
//# sourceMappingURL=implMeasure_measureView.js.map