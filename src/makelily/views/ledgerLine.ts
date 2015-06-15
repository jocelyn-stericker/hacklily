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

import MusicXML = require("musicxml-interfaces");
import * as React from "react"; // TS 1.5 workaround
import {createFactory as $, PropTypes} from "react";

import Line from "./primitives/line";
import {bboxes} from "../models/smufl";

/**
 * Renders a ledger line at (x, y + line).
 */
class LedgerLine extends React.Component<{spec: MusicXML.PrintStyle, notehead: string}, void> {
    render() {
        const spec = this.props.spec;
        const west = bboxes[this.props.notehead][3];
        const east = bboxes[this.props.notehead][0];
        const xOffset = (east - west)*10;
        return $(Line)({
            stroke: spec.color,
            strokeWidth: 2.2,
                // Ledger lines should be thicker than regular lines.
            x1: this.context.originX + spec.defaultX + (spec.relativeX || 0) - 3.2,
            x2: this.context.originX + spec.defaultX + (spec.relativeX || 0) + xOffset - 0.2,
            y1: this.context.originY - spec.defaultY - (spec.relativeX || 0),
            y2: this.context.originY - spec.defaultY - (spec.relativeX || 0)
        });
    }
}

module LedgerLine {
    export let contextTypes = <any> {
        originX: PropTypes.number.isRequired,
        originY: PropTypes.number.isRequired
    };
}

export default LedgerLine;
