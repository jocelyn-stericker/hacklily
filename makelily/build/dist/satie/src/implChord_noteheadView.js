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
import * as React from "react";
import { Component } from "react";
import * as PropTypes from "prop-types";
import Glyph from "./private_views_glyph";
/**
 * Renders a notehead.
 */
var NoteheadView = /** @class */ (function (_super) {
    __extends(NoteheadView, _super);
    function NoteheadView() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    NoteheadView.prototype.render = function () {
        var spec = this.props.spec;
        var pos = spec;
        var head = spec;
        return (React.createElement(Glyph, { fill: head.color, glyphName: this.props.notehead, 
            // scale: this.props.grace ? 0.6 : 1.0,
            x: pos.defaultX + (pos.relativeX || 0), y: this.context.originY - pos.defaultY - (pos.relativeY || 0) }));
    };
    NoteheadView.contextTypes = {
        originY: PropTypes.number.isRequired,
    };
    return NoteheadView;
}(Component));
export default NoteheadView;
//# sourceMappingURL=implChord_noteheadView.js.map