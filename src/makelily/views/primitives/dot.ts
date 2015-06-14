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

import React = require("react");

/**
 * Responsible for the rendering of a dot as part of a dotted note.
 * This is not used to render staccatos.
 */
class Dot extends React.Component<Dot.IProps, void> {
    render() {
        // See rationale for hidden rect in _glyph.jsx
        return React.DOM.g(null,
            React.DOM.circle({
                cx: this.props.x,
                cy: this.props.y,
                fill: this.props.fill,
                r: <any>(this.props.radius)}
            /*React.DOM.circle*/)
        /*React.DOM.g*/);
    }
}

module Dot {
    export interface IProps {
        x: number;
        y: number;
        radius: number;
        fill: string;
    }
}

export = Dot;
