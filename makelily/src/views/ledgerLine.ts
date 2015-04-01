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

import MusicXML         = require("musicxml-interfaces");
import React            = require("react");
let $                   = React.createFactory;

import Line             = require("./primitives/line");
import SMuFL            = require("../models/smufl");

/**
 * Renders a ledger line at (x, y + line).
 */
class LedgerLine extends React.Component<{spec: MusicXML.PrintStyle, notehead: string}, void> {
    render() {
        const spec = this.props.spec;
        const west = SMuFL.bboxes[this.props.notehead][3];
        const east = SMuFL.bboxes[this.props.notehead][0];
        const xOffset = (east - west)*10;
        return $(Line)({
            x1:                         this.context.originX + spec.defaultX + (spec.relativeX || 0) - 3.2,
            x2:                         this.context.originX + spec.defaultX + (spec.relativeX || 0) + xOffset - 0.2,
            y1:                         this.context.originY - spec.defaultY - (spec.relativeX || 0),
            y2:                         this.context.originY - spec.defaultY - (spec.relativeX || 0),
            stroke:                     spec.color,
            strokeWidth:                2.2
                // Ledger lines should be thicker than regular lines.
        });
    }
}

module LedgerLine {
    export var contextTypes = <any> {
        originX:         React.PropTypes.number.isRequired,
        originY:         React.PropTypes.number.isRequired
    };
}

export = LedgerLine;
