/**
 * @source: https://github.com/jnetterf/satie/
 *
 * @license
 * (C) Josh Netterfield <joshua@nettek.ca> 2015.
 * Part of the Satie music engraver <https://github.com/jnetterf/satie>.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
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
import { map } from "lodash";
import Glyph from "./private_views_glyph";
import Dynamics from "./implDirection_dynamicsView";
import Words from "./implDirection_wordsView";
var DirectionView = /** @class */ (function (_super) {
    __extends(DirectionView, _super);
    function DirectionView() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    DirectionView.prototype.render = function () {
        var _this = this;
        var model = this.props.layout.model;
        var children = map(model.directionTypes, function (type, idx) {
            switch (true) {
                case !!type.accordionRegistration:
                    return null;
                case !!type.bracket:
                    return null;
                case !!type.codas:
                    return null;
                case !!type.damp:
                    return null;
                case !!type.dampAll:
                    return null;
                case !!type.dashes:
                    return null;
                case !!type.dynamics:
                    return React.createElement(Dynamics, { key: "d_" + idx, layout: _this.props.layout });
                case !!type.eyeglasses:
                    return null;
                case !!type.harpPedals:
                    return null;
                case !!type.image:
                    return null;
                case !!type.metronome:
                    return null;
                case !!type.octaveShift:
                    return null;
                case !!type.otherDirection:
                    return null;
                case !!type.pedal:
                    return null;
                case !!type.percussions:
                    return null;
                case !!type.principalVoice:
                    return null;
                case !!type.rehearsals:
                    return null;
                case !!type.scordatura:
                    return null;
                case !!type.segnos:
                    return (React.createElement("g", null, map(type.segnos, function (segno, segnoIdx) { return (React.createElement(Glyph, { glyphName: "segno", key: segnoIdx, x: _this.props.layout.overrideX +
                            segno.defaultX +
                            (segno.relativeX || 0), y: (_this.context.originY || 0) -
                            segno.defaultY -
                            (segno.relativeY || 0), fill: segno.color })); })));
                case !!type.stringMute:
                    return null;
                case !!type.wedge:
                    return null;
                case !!type.words:
                    return React.createElement(Words, { key: "d_" + idx, layout: _this.props.layout });
                default:
                    throw new Error("Invalid direction in " + type);
            }
        }).filter(function (el) { return !!el; });
        switch (children.length) {
            case 0:
                return null;
            case 1:
                return children[0];
            default:
                return React.createElement("g", null, children);
        }
    };
    DirectionView.contextTypes = {
        originY: PropTypes.number,
    };
    return DirectionView;
}(Component));
export default DirectionView;
//# sourceMappingURL=implDirection_directionView.js.map