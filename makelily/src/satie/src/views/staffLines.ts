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

import {StaffDetails} from "musicxml-interfaces";
import {createFactory as $, Component, DOM, PropTypes} from "react";
import {times} from "lodash";

import Line from "./primitives/line";
import {bravura} from "../models/smufl";

/**
 * Renders the (usually 5) lines that make up a staff.
 */
class StaffLines extends Component<StaffLines.IProps, {}> {
    render(): any {
        let middle = this.context.originY - this.props.defaultY;
        let staffDetails = this.props.staffDetails;
        let offset = (staffDetails.staffLines - 1)/2;
        return DOM.g(null,
            times(staffDetails.staffLines, i => $(Line)({
                key: "staff-" + i,
                stroke: "#6A6A6A",
                // TODO: Use print
                strokeWidth: bravura.engravingDefaults.staffLineThickness*10,
                x1: this.props.defaultX + this.context.originX,
                x2: this.props.defaultX + this.context.originX + this.props.width,
                y1: middle - 10*(i - offset),
                y2: middle - 10*(i - offset)
            }))
        /* DOM.g */);
    }
}

module StaffLines {
    export interface IProps {
        key?: string | number;
        width: number;
        staffDetails: StaffDetails;
        defaultX: number;
        defaultY: number;
    }
    export let contextTypes = <any> {
        originY: PropTypes.number.isRequired,
        originX: PropTypes.number.isRequired
    };
}

export default StaffLines;
