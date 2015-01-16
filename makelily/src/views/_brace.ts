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

import React            = require("react");
import TypedReact       = require("typed-react");
import PureRenderMixin  = require("react/lib/ReactComponentWithPureRenderMixin");

import C                = require("../stores/contracts");
import _Line            = require("./_line");
import _Glyph           = require("./_glyph");

var    Line             = React.createFactory(_Line.Component);
var    Glyph            = React.createFactory(_Glyph.Component);

/**
 * Renders a piano bracket or other kind of brace.
 */
class Brace extends TypedReact.Component<Brace.IProps, {}> {
    render() {
        var defaults = C.SMuFL.bravuraMetadata.engravingDefaults;

        var height = (this.props.y2 - this.props.y) + 40;
        var bottom = this.props.y2 + 20;
        var s = height/40;
        return React.DOM.g(null,
            Glyph({
                transform: "scale(" + s + "," + s + ")" +
                    "translate(" + (-this.props.x*(1-1/s)) + "," +
                    -(1-1/s)*bottom + ")",
                fill: "#000000",
                key: 0,
                x: this.props.x - 5,
                y: bottom,
                glyphName: "brace"
            }),
            Line({
                stroke: "#000000",
                strokeWidth: defaults.thinBarlineThickness*10,
                key: 1,
                x1: this.props.x,
                x2: this.props.x,
                y1: this.props.y - 20,
                y2: this.props.y2 + 20
            })
        /* React.DOM.g */);
    }
}

module Brace {
    export var Component = TypedReact.createClass(Brace, <any> [PureRenderMixin]);

    export interface IProps {
        x: number;
        y: number;
        y2: number;
        idx: number;
    }
}

export = Brace;
