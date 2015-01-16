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

import NewlineModel         = require("../stores/newline");
import PureModelViewMixin   = require("./pureModelViewMixin");
import _StaveLines          = require("./_staveLines");
import _BarNumber           = require("./_barNumber");

var    StaveLines           = React.createFactory(_StaveLines.Component);
var    BarNumber            = React.createFactory(_BarNumber.Component);

/**
 * Appears at the very beginning of a line, except the first line.
 * 
 * See also BeginModel and BeginView.
 */
class NewlineView extends TypedReact.Component<NewlineView.IProps, {}> {
    render() {
        var spec        = this.props.spec;
        var barNumber   = spec.ctxData.bar + "";

        return React.DOM.g(null,
            StaveLines({
                key: "StaveLines",
                width: this.props.spec.staveW,
                x: spec.x,
                y: spec.braceY
            }),
            BarNumber({
                x: spec.x - 0,
                y: spec.braceY - 30,
                barNumber: barNumber
            })
        /* React.DOM.g */);
    }
};

module NewlineView {
    export var Component = TypedReact.createClass(NewlineView, <any> [PureModelViewMixin]);

    export interface IProps {
        key: number;
        spec: NewlineModel;
    }
}

export = NewlineView;
