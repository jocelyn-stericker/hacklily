/** 
 * (C) Josh Netterfield <joshua@nettek.ca> 2015.
 * Part of the Satie music engraver <https://github.com/jnetterf/satie>.
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

import {Component, DOM, PropTypes, ReactElement} from "react";
import {forEach} from "lodash";

import {IMeasureLayout, IModel} from "../engine";

class DebugBox extends Component<{layout: IMeasureLayout, key?: string | number}, void> {
    render(): any {
        if (!process.env["DEBUG"]) {
            return null;
        }
        let layout = this.props.layout;
        let boxes: ReactElement<any>[] = [];
        let context = this.context;
        forEach(layout.elements, function(segment, si) {
            forEach(segment, function(element, j) {
                let originX = layout.originX + element.overrideX;
                let originY = context.originYByPartAndStaff["P1"][1]; // FIXME
                forEach(element.boundingBoxes$, (box, k) => {
                    boxes.push(DOM.rect({
                        dangerouslySetInnerHTML: {
                            __html: `<!-- ${IModel.Type[element.renderClass]} -->`
                        },
                        fill: "transparent",
                        height: box.bottom - box.top,
                        key: `debug_${si}_${j}_${k}`,
                        stroke: "red",
                        width: box.right - box.left,
                        x: originX + box.defaultX + (box.relativeX||0) + box.left,
                        y: originY - box.defaultY - (box.relativeY||0) - box.bottom
                    }));
                });
            });
        });

        return DOM.g(null, boxes);
    }
}

const NUMBER_ARRAY = PropTypes.arrayOf(PropTypes.number);

module DebugBox {
    export let contextTypes = <any> {
        originY: PropTypes.number,
        originYByPartAndStaff: PropTypes.objectOf(NUMBER_ARRAY).isRequired
    };
}

export default DebugBox;
