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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
var PropTypes = __importStar(require("prop-types"));
var document_1 = require("./document");
var private_views_metadata_1 = require("./private_views_metadata");
var implAttributes_attributesView_1 = __importDefault(require("./implAttributes_attributesView"));
var implBarline_barlineView_1 = __importDefault(require("./implBarline_barlineView"));
var implChord_chordView_1 = __importDefault(require("./implChord_chordView"));
var implDirection_directionView_1 = __importDefault(require("./implDirection_directionView"));
var implVisualCursor_visualCursorView_1 = __importDefault(require("./implVisualCursor_visualCursorView"));
var $AttributesView = react_1.createFactory(implAttributes_attributesView_1.default);
var $BarlineView = react_1.createFactory(implBarline_barlineView_1.default);
var $ChordView = react_1.createFactory(implChord_chordView_1.default);
var $DirectionView = react_1.createFactory(implDirection_directionView_1.default);
var $VisualCursorView = react_1.createFactory(implVisualCursor_visualCursorView_1.default);
var NUMBER_ARRAY = PropTypes.arrayOf(PropTypes.number);
var ModelView = /** @class */ (function (_super) {
    __extends(ModelView, _super);
    function ModelView() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ModelView.prototype.render = function () {
        var layout = this.props.layout;
        switch (layout.renderClass) {
            case document_1.Type.Attributes:
                return $AttributesView({ layout: layout });
            case document_1.Type.Barline:
                return $BarlineView({ layout: layout });
            case document_1.Type.Chord:
                return $ChordView({ layout: layout });
            case document_1.Type.Direction:
                return $DirectionView({ layout: layout });
            case document_1.Type.VisualCursor:
                return $VisualCursorView({ layout: layout });
            default:
                return null;
        }
    };
    ModelView.prototype.getChildContext = function () {
        var layout = this.props.layout;
        return {
            originY: this.context.originYByPartAndStaff[layout.part][layout.model.staffIdx || 1] || 0
        };
    };
    ModelView.prototype.shouldComponentUpdate = function (nextProps, nextState) {
        if (nextProps.version !== this.props.version) {
            return true;
        }
        if (this.props.layout.renderClass === document_1.Type.Attributes &&
            this.props.layout.staffWidth !== nextProps.layout.staffWidth) {
            return true;
        }
        return false;
    };
    ModelView.childContextTypes = {
        originY: PropTypes.number,
    };
    ModelView.contextTypes = {
        originYByPartAndStaff: PropTypes.objectOf(NUMBER_ARRAY).isRequired,
    };
    ModelView = __decorate([
        private_views_metadata_1.Targetable()
    ], ModelView);
    return ModelView;
}(react_1.Component));
exports.default = ModelView;
//# sourceMappingURL=implSegment_modelView.js.map