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
import { Type } from "./document";
import { Targetable } from "./private_views_metadata";
import AttributesView from "./implAttributes_attributesView";
import BarlineView from "./implBarline_barlineView";
import ChordView from "./implChord_chordView";
import DirectionView from "./implDirection_directionView";
import VisualCursorView from "./implVisualCursor_visualCursorView";
var NUMBER_ARRAY = PropTypes.arrayOf(PropTypes.number);
var ModelView = /** @class */ (function (_super) {
    __extends(ModelView, _super);
    function ModelView() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ModelView.prototype.render = function () {
        var layout = this.props.layout; // Sigh...
        switch (layout.renderClass) {
            case Type.Attributes:
                return React.createElement(AttributesView, { layout: layout });
            case Type.Barline:
                return React.createElement(BarlineView, { layout: layout });
            case Type.Chord:
                return React.createElement(ChordView, { layout: layout });
            case Type.Direction:
                return React.createElement(DirectionView, { layout: layout });
            case Type.VisualCursor:
                return React.createElement(VisualCursorView, { layout: layout });
            default:
                return null;
        }
    };
    ModelView.prototype.getChildContext = function () {
        var layout = this.props.layout;
        return {
            originY: this.context.originYByPartAndStaff[layout.part][layout.model.staffIdx || 1] || 0,
        };
    };
    ModelView.prototype.shouldComponentUpdate = function (nextProps, _nextState) {
        if (nextProps.version !== this.props.version) {
            return true;
        }
        if (this.props.layout.renderClass === Type.Attributes &&
            this.props.layout.staffWidth !==
                nextProps.layout.staffWidth) {
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
    return ModelView;
}(Component));
Targetable()(ModelView);
export default ModelView;
//# sourceMappingURL=implSegment_modelView.js.map