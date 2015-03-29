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

import React                = require("react");
import _                    = require("lodash");
var $                       = React.createFactory;

import Engine               = require("../models/engine");
import ModelView            = require("./modelView");

class MeasureView extends React.Component<{layout: Engine.Measure.IMeasureLayout}, void> {
    render(): any {
        let layout = this.props.layout;

        return React.DOM.g(null,
            _.chain(_.flatten(layout.elements))
                .filter((layout: Engine.IModel.ILayout) => !!layout.model)   // Remove helpers.
                .map((layout: Engine.IModel.ILayout) => $(ModelView)({
                    layout: layout,
                    key: (<any>layout).key}))
                .value()
        /*React.DOM.g*/);

        /* TODO: lyric boxes */
        /* TODO: free boxes */
        /* TODO: slurs and ties */
    }

    getChildContext() {
        const layout        = this.props.layout;
        return {
            originX:        layout.originX,
            originY:        this.context.originY - layout.originY
        };
    }
}

module MeasureView {
    export var childContextTypes = <any> {
        originX:            React.PropTypes.number.isRequired,
        originY:            React.PropTypes.number.isRequired
    };
    export var contextTypes = <any> {
        originY:            React.PropTypes.number.isRequired
    };
}

export = MeasureView;
