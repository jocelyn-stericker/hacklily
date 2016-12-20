/**
 * @source: https://github.com/jnetterf/satie/
 *
 * @license
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

import {createFactory, Component, DOM, PropTypes} from "react";
import {chain, flatten, mapValues, map, forEach} from "lodash";
import * as invariant from "invariant";

import IMeasureLayout from "../private/measureLayout";
import ILayout from "../private/layout";
import {MAX_SAFE_INTEGER} from "../private/constants";

import ModelView from "../implSegment/modelView";

const $ModelView = createFactory(ModelView);

export interface IProps {
    layout: IMeasureLayout;
    key?: string | number;
    version: number;
}

const NUMBER_ARRAY = PropTypes.arrayOf(PropTypes.number);

export default class MeasureView extends Component<IProps, void> {
    static childContextTypes = {
        originYByPartAndStaff: PropTypes.objectOf(NUMBER_ARRAY).isRequired,
        systemBottom: PropTypes.number.isRequired,
        systemTop: PropTypes.number.isRequired
    } as any;

    static contextTypes = {
        originY: PropTypes.number
    } as any;

    context: {
        originY: number;
    };

    render(): any {
        const layout = this.props.layout;
        console.log("Rerender");

        return DOM.g({transform: `translate(${layout.originX})`},
            chain(flatten(layout.elements))
                .filter((layout: ILayout) => !!layout.model)   // Remove helpers.
                .map((layout: ILayout) => $ModelView({
                    key: (<any>layout).key,
                    version: this.props.layout.getVersion(),
                    layout,
                    originX: this.props.layout.originX,
                }))
                .value()
        /*DOM.g*/);

        /* TODO: lyric boxes */
        /* TODO: free boxes */
        /* TODO: slurs and ties */
    }

    getChildContext() {
        let {layout} = this.props;
        let originYByPartAndStaff = mapValues(layout.originY, layouts => this.extractOrigins(layouts));
        let bottom = MAX_SAFE_INTEGER;
        let top = 0;
        forEach(layout.originY, origins => {
            forEach(origins, (origin, staff) => {
                if (!staff) {
                    return;
                }
                bottom = Math.min(origin, bottom);
                top = Math.max(origin, top);
            });
        });

        // TODO 1: Fix stave height
        // TODO 2: Do not ignore top/bottom staff in staffGroup of attributes
        // TODO 3: A part can be in many groups.
        return {
            originYByPartAndStaff: originYByPartAndStaff,
            systemBottom: this.context.originY - bottom + 20.5,
            systemTop: this.context.originY - top - 20.5
        };
    }

    extractOrigins(layouts: number[]) {
        return map(layouts, layout => this.invert(layout));
    }

    invert(y: number) {
        return this.context.originY - y;
    }

    shouldComponentUpdate(nextProps: IProps) {
        invariant(!isNaN(this.props.version), `Invalid non-numeric version ${this.props.version}`);
        return this.props.version !== nextProps.version ||
            this.props.layout.originX !== nextProps.layout.originX ||
            this.props.layout.width !== nextProps.layout.width;
    }
}
