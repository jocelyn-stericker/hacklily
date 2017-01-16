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

import {Component, DOM} from "react";

export interface IProps {
    fill: string;
    stroke: string;
    strokeWidth: number;
    x1: number; x2: number; x3: number; x4: number; x5: number; x6: number;
    y1: number; y2: number; y3: number; y4: number; y5: number; y6: number;
}

/**
 * Responsible for the rendering a bezier curve, such as a
 * slur or a tie.
 */
export default class Bezier extends Component<IProps, void> {
    render(): any {
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
