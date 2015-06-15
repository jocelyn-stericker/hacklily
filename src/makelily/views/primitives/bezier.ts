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
import {DOM} from "react";

/**
 * Responsible for the rendering a bezier curve, such as a
 * slur or a tie.
 */
class Bezier extends React.Component<Bezier.IProps, void> {
    render() {
        return DOM.path({
            d: <any>
               ("M" +
                    this.props.x1 + "," + this.props.y1 +
                "C" +
                    this.props.x2 + "," + this.props.y2 + " " +
                    this.props.x3 + "," + this.props.y3 + " " +
                    this.props.x4 + "," + this.props.y4 + " " +
                "C" +
                    this.props.x5 + "," + this.props.y5 + " " +
                    this.props.x6 + "," + this.props.y6 + " " +
                    this.props.x1 + "," + this.props.y1),
            fill: this.props.fill,
            stroke: this.props.stroke,
            strokeWidth: this.props.strokeWidth
        });
    }
}

module Bezier {
    export interface IProps {
        fill: string;
        stroke: string;
        strokeWidth: number;
        x1: number; x2: number; x3: number; x4: number; x5: number; x6: number;
        y1: number; y2: number; y3: number; y4: number; y5: number; y6: number;
    }
}

export default Bezier;
