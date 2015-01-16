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

var    Line             = React.createFactory(_Line.Component);

/**
 * Renders a ledger line at (x, y + line).
 */
class LedgerLine extends TypedReact.Component<LedgerLine.IProps, {}> {
    render() {
        var west = C.SMuFL.bravuraBBoxes[this.props.notehead][3];
        var east = C.SMuFL.bravuraBBoxes[this.props.notehead][0];
        var xOffset = (east - west)*10;
        return Line({
            x1:                         this.props.x - 3.2,
            x2:                         this.props.x + xOffset - 0.2,
            y1:                         this.props.y - (this.props.line - 3)*10,
            y2:                         this.props.y - (this.props.line - 3)*10,
            victoriaXStrokeWidthFactor: 0,
            stroke:                     "#000000",
            strokeWidth:                2.2
                // Ledger lines should be thicker than regular lines.
        });
    }
}

module LedgerLine {
    export var Component = TypedReact.createClass(LedgerLine, <any> [PureRenderMixin]);

    export interface IProps {
        line:       number;
        notehead:   string;
        x:          number;
        y:          number;
    }
}

export = LedgerLine;
