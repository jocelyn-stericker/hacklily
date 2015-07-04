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

import {createFactory as $, Component, DOM, PropTypes} from "react";
import _ = require("lodash");

import DebugBox from "./debugBox";
import {IModel, IMeasureLayout, MAX_SAFE_INTEGER} from "../engine";
import ModelView from "./modelView";

class MeasureView extends Component<{layout: IMeasureLayout}, void> {
    render(): any {
        let layout = this.props.layout;

        return DOM.g(null,
            _.chain(_.flatten(layout.elements))
                .filter((layout: IModel.ILayout) => !!layout.model)   // Remove helpers.
                .map((layout: IModel.ILayout) => $(ModelView)({
                    key: (<any>layout).key,
                    layout: layout
                }))
                .value(),
            $(DebugBox)({key: "debugBox", layout: layout})
        /*DOM.g*/);

        /* TODO: lyric boxes */
        /* TODO: free boxes */
        /* TODO: slurs and ties */
    }

    getChildContext() {
        let {layout} = this.props;
        let originYByPartAndStaff = _.mapValues(layout.originY, this.extractOrigins, this);
        let bottom = MAX_SAFE_INTEGER;
        let top = 0;
        _.forEach(layout.originY, origins => {
            _.forEach(origins, (origin, staff) => {
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
            originX: layout.originX,
            originYByPartAndStaff: originYByPartAndStaff,
            systemBottom: this.context.originY - bottom + 20.5,
            systemTop: this.context.originY - top - 20.5
        };
    }

    extractOrigins(layouts: number[]) {
        return _.map(layouts, this.invert, this);
    }

    invert(y: number) {
        return this.context.originY - y;
    }
}

const NUMBER_ARRAY = PropTypes.arrayOf(PropTypes.number);

module MeasureView {
    export let childContextTypes = <any> {
        originX: PropTypes.number.isRequired,
        originYByPartAndStaff: PropTypes.objectOf(NUMBER_ARRAY).isRequired,
        systemBottom: PropTypes.number.isRequired,
        systemTop: PropTypes.number.isRequired
    };
    export let contextTypes = <any> {
        originY: PropTypes.number
    };
}

export default MeasureView;
