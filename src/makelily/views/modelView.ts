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

import {createFactory as $, Component, PropTypes} from "react";

import Attributes from "./attributes";
import Barline from "./barline";
import Chord from "./chord";
import Direction from "./direction";
import {IModel} from "../engine";

class ModelView extends Component<{layout: IModel.ILayout, key?: string | number}, void> {
    render(): any {
        let layout = <any> this.props.layout;
        switch(layout.renderClass) {
        case IModel.Type.Attributes:
            return $(Attributes)({layout: layout});
        case IModel.Type.Barline:
            return $(Barline)({layout: layout});
        case IModel.Type.Chord:
            return $(Chord)({layout: layout});
        case IModel.Type.Direction:
            return $(Direction)({layout: layout});
        default:
            return null;
        }
    }

    getChildContext() {
        const layout = this.props.layout;
        return {
            originY: this.context.originYByPartAndStaff[layout.part][layout.model.staffIdx || 1] || 0
        };
    }
}

const NUMBER_ARRAY = PropTypes.arrayOf(PropTypes.number);

module ModelView {
    export let childContextTypes = <any> {
        originY: PropTypes.number
    };
    export let contextTypes = <any> {
        originYByPartAndStaff: PropTypes.objectOf(NUMBER_ARRAY).isRequired,
    };
}

export default ModelView;
