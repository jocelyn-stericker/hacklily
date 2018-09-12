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
var react_1 = require("react");
var DOM = __importStar(require("react-dom-factories"));
var PropTypes = __importStar(require("prop-types"));
var lodash_1 = require("lodash");
var invariant_1 = __importDefault(require("invariant"));
var private_util_1 = require("./private_util");
var implSegment_modelView_1 = __importDefault(require("./implSegment_modelView"));
var $ModelView = react_1.createFactory(implSegment_modelView_1.default);
var NUMBER_ARRAY = PropTypes.arrayOf(PropTypes.number);
var MeasureView = /** @class */ (function (_super) {
    __extends(MeasureView, _super);
    function MeasureView() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    MeasureView.prototype.render = function () {
        var _this = this;
        var layout = this.props.layout;
        return DOM.g({ transform: "translate(" + layout.originX + ")" }, lodash_1.chain(lodash_1.flatten(layout.elements))
            .filter(function (layout) { return !!layout.model; }) // Remove helpers.
            .map(function (layout) { return $ModelView({
            key: layout.key,
            version: _this.props.layout.getVersion(),
            layout: layout,
            originX: _this.props.layout.originX,
        }); })
            .value()
        /*DOM.g*/ );
        /* TODO: lyric boxes */
        /* TODO: free boxes */
        /* TODO: slurs and ties */
    };
    MeasureView.prototype.getChildContext = function () {
        var _this = this;
        var layout = this.props.layout;
        var originYByPartAndStaff = lodash_1.mapValues(layout.originY, function (layouts) { return _this.extractOrigins(layouts); });
        var bottom = private_util_1.MAX_SAFE_INTEGER;
        var top = 0;
        lodash_1.forEach(layout.originY, function (origins) {
            lodash_1.forEach(origins, function (origin, staff) {
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
            systemTop: this.context.originY - top - 20.5
        };
    };
    MeasureView.prototype.extractOrigins = function (layouts) {
        var _this = this;
        return lodash_1.map(layouts, function (layout) { return _this.invert(layout); });
    };
    MeasureView.prototype.invert = function (y) {
        return this.context.originY - y;
    };
    MeasureView.prototype.shouldComponentUpdate = function (nextProps) {
        invariant_1.default(!isNaN(this.props.version), "Invalid non-numeric version " + this.props.version);
        return this.props.version !== nextProps.version ||
            this.props.layout.originX !== nextProps.layout.originX ||
            this.props.layout.width !== nextProps.layout.width;
    };
    MeasureView.childContextTypes = {
        originYByPartAndStaff: PropTypes.objectOf(NUMBER_ARRAY).isRequired,
        systemBottom: PropTypes.number.isRequired,
        systemTop: PropTypes.number.isRequired
    };
    MeasureView.contextTypes = {
        originY: PropTypes.number
    };
    return MeasureView;
}(react_1.Component));
exports.default = MeasureView;
//# sourceMappingURL=implMeasure_measureView.js.map