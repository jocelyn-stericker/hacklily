/**
 * (C) Josh Netterfield <joshua@nettek.ca> 2015.
 * Part of the Satie music engraver <https://github.com/ripieno/satie>.
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

"use strict";

import MusicXML             = require("musicxml-interfaces");
import React                = require("react");
import _                    = require("lodash");
var $                       = React.createFactory;

import Barline              = require("../models/barline");
import Line                 = require("./primitives/line");
import SMuFL                = require("../models/smufl");

/**
 * Renders a full-stave-height barline at (x,y).
 * Does not do any interesting calculations.
 */
class BarlineView extends React.Component<{layout: Barline.ILayout}, {}> {
    render(): any {
        const {originX, originY} = this.context;

        const layout = this.props.layout;
        const model = layout.model;
        const defaults = SMuFL.bravura.engravingDefaults;

        const x = originX + model.defaultX;
        const y = originY - model.defaultY;

        return React.DOM.g(null,
            _.map(layout.lineStarts, (start, idx) => $(Line)({
                key: idx,
                x1: x + start + layout.lineWidths[idx]/2,
                x2: x + start + layout.lineWidths[idx]/2,
                y1: y - layout.height - layout.yOffset,
                y2: y + layout.height - layout.yOffset,
                stroke: model.barStyle.color,
                fill: model.barStyle.color,
                strokeWidth: layout.lineWidths[idx]
            }))
        /* React.DOM.g */);
    }
};

module BarlineView {
    export var contextTypes = <any> {
        originX:         React.PropTypes.number.isRequired,
        originY:         React.PropTypes.number.isRequired
    };
}

export = BarlineView;
