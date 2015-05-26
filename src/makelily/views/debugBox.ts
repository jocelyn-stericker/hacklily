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

class DebugBox extends React.Component<{layout: Engine.Measure.IMeasureLayout}, void> {

    render(): any {
        if (!process.env["DEBUG"]) {
            return null;
        }
        let layout = this.props.layout;
        let boxes: React.ReactElement<any>[] = [];
        let context = this.context;
        _.forEach(layout.elements, function(segment, si) {
            _.forEach(segment, function(element, j) {
                _.forEach(element.boundingBoxes$, (box, k) => {
                    boxes.push(React.DOM.rect({
                        key: `debug_${si}_${j}_${k}`,
                        stroke: "red",
                        fill: "transparent",
                        x: layout.originX + element.barX + box.defaultX + (box.relativeX||0) + box.left,
                        width: box.right - box.left,
                        y: context.originYA[element.model.staffIdx] - box.defaultY - (box.relativeY||0) - box.bottom, 
                        height: box.bottom - box.top,
                        dangerouslySetInnerHTML: {__html: `<!-- ${Engine.IModel.Type[element.renderClass]} -->`}
                    }));
                });
            });
        });

        return React.DOM.g(null, boxes);
    }
}

module DebugBox {
    export var contextTypes = <any> {
        originY:            React.PropTypes.number,
        originYA:           React.PropTypes.arrayOf(React.PropTypes.number).isRequired,
    };
}

export = DebugBox;
