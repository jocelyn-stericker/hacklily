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

import Attributes           = require("./attributes");
import Barline              = require("../models/barline");
import Line                 = require("./primitives/line");

/**
 * Renders a full-stave-height barline at (x,y).
 * Does not do any interesting calculations.
 */
class BarlineView extends React.Component<{layout: Barline.ILayout}, {}> {
    render(): any {
        const originX = this.context.originX;
        const originY = this.context.originY;

        const layout = this.props.layout;
        const model = layout.model;

        const x = originX + model.defaultX;
        const y = originY - model.defaultY;

        // TODO: render MusicXML.BarStyleType.Dashed:
        // TODO: render MusicXML.BarStyleType.Dotted:
        // TODO: render MusicXML.BarStyleType.Short:
        // TODO: render MusicXML.BarStyleType.Tick:

        if (layout.partSymbol && layout.partSymbol.type !== MusicXML.PartSymbolType.None) {
            var yTop = <number> this.context.systemTop;
            var yBottom = <number> this.context.systemBottom;
        } else {
            var yTop = y - layout.height - layout.yOffset;
            var yBottom = y + layout.height - layout.yOffset;
        }

        if (model.satieAttributes) {
            model.satieAttributes.overrideX = layout.overrideX + model.satieAttribsOffset;
        }

        return React.DOM.g(null,
            _.map(layout.lineStarts, (start, idx) => $(Line)({
                key: idx,
                x1: x + start + layout.lineWidths[idx]/2,
                x2: x + start + layout.lineWidths[idx]/2,
                y1: yTop,
                y2: yBottom,
                stroke: model.barStyle.color,
                fill: model.barStyle.color,
                strokeWidth: layout.lineWidths[idx]
            })),
            model.satieAttributes && $(Attributes)({
                layout: model.satieAttributes
            })
        /* React.DOM.g */);
    }
};

module BarlineView {
    export var contextTypes = <any> {
        originX:        React.PropTypes.number.isRequired,
        originY:        React.PropTypes.number.isRequired,
        systemTop:      React.PropTypes.number.isRequired,
        systemBottom:   React.PropTypes.number.isRequired
    };
}

export = BarlineView;
