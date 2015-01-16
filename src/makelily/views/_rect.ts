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

/**
 * Renders a rectangle (can be rotated!)
 */
class Rect extends TypedReact.Component<Rect.IProps, {}> {
    render() {
        return React.DOM.rect({
            className: this.props.className,
            opacity: this.props.opacity || 1.0,
            x: <any> (this.props.x),
            y: <any> (this.props.y),
            stroke: this.props.stroke,
            fill: this.props.fill,
            height: <any>(this.props.height),
            width: <any>(this.props.width)});
    }
}

module Rect {
    export interface IProps {
        className?: string;
        fill: string;
        height: number;
        opacity: number;
        stroke: string;
        width: number;
        x: number;
        y: number;
    }

    export var Component = TypedReact.createClass(Rect, <any> [PureRenderMixin]);
}

export = Rect;
