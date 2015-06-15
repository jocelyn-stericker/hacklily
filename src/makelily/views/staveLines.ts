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

import * as React from "react"; // TS 1.5 workaround
import {createFactory as $, DOM, PropTypes} from "react";
import _ = require("lodash");

import Line from "./primitives/line";
import {bravura} from "../models/smufl";

/**
 * Renders the (usually 5) lines that make up a stave.
 */
class StaveLines extends React.Component<StaveLines.IProps, {}> {
    render() {
        let top = this.context.originY - this.props.y;
        return DOM.g(null,
            _.times(this.props.lines, i => $(Line)({
                key: "staff-" + i,
                stroke: "#6A6A6A",
                // TODO: Use print
                strokeWidth: bravura.engravingDefaults.staffLineThickness*10,
                x1: this.props.x,
                x2: this.props.x + this.props.width,
                y1: top - 10*(i - 2),
                y2: top - 10*(i - 2)
            }))
        /* DOM.g */);
    }
}

module StaveLines {
    export let contextTypes = <any> {
        originY: PropTypes.number.isRequired
    };
    export interface IProps {
        lines: number;
        width: number;
        x: number;
        y: number;
    }
}

export default StaveLines;
