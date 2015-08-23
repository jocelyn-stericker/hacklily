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

import {Component, DOM} from "react";

/**
 * Renders a straight line.
 */
class Line extends Component<Line.IProps, {}> {
    render(): any {
        return DOM.line({
            className: this.props.className,
            stroke: this.props.stroke,
            strokeWidth: <any> (this.props.strokeWidth),
            x1: <any> (this.props.x1),
            x2: <any> (this.props.x2),
            y1: <any> (this.props.y1),
            y2: <any> (this.props.y2)
        });
    }
}

module Line {
    export interface IProps {
        key?: string | number;
        className?: string;
        stroke: string;
        strokeWidth: number;
        x1: number;
        x2: number;
        y1: number;
        y2: number;
    }
}

export default Line;
