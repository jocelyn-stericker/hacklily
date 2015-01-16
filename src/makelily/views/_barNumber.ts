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

import React                = require("react");
import TypedReact           = require("typed-react");
import PureRenderMixin      = require("react/lib/ReactComponentWithPureRenderMixin");

class BarNumber extends TypedReact.Component<BarNumber.IProps, {}> {
    render(): any {
        return React.DOM.text({
            x: this.props.x,
            y: this.props.y,
            fontSize: 24,
            className: "bn_"
        }, this.props.barNumber);
    }
};

module BarNumber {
    export var Component = TypedReact.createClass(BarNumber, <any> [PureRenderMixin]);

    export interface IProps {
        barNumber: string;
        x: number;
        y: number;
    }
}

export = BarNumber;
