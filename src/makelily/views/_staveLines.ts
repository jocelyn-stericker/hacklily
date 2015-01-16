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
import _                = require("lodash");
import PureRenderMixin  = require("react/lib/ReactComponentWithPureRenderMixin");

import _Line            = require("./_line");
import SMuFL            = require("../util/SMuFL");

var    Line             = React.createFactory(_Line.Component);

/**
 * Renders the (usually 5) lines that make up a stave.
 */
class StaveLines extends TypedReact.Component<StaveLines.IProps, {}> {
    render() {
        return React.DOM.g(null,
            _.times(5, i => Line({
                key: "staff-" + i,
                x1: this.props.x,
                x2: this.props.x + this.props.width,
                y1: this.props.y - 10*(i - 2),
                y2: this.props.y - 10*(i - 2),
                stroke: "#6A6A6A",
                victoriaXStrokeWidthFactor: 0,
                strokeWidth: SMuFL.bravuraMetadata.engravingDefaults.staffLineThickness*10
            }))
        /* React.DOM.g */);
    }
}

module StaveLines {
    export var Component = TypedReact.createClass(StaveLines, <any> [PureRenderMixin]);

    export interface IProps {
        width: number;
        x: number;
        y: number;
    }
}

export = StaveLines;
