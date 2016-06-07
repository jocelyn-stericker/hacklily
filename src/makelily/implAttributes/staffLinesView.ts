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

import {StaffDetails} from "musicxml-interfaces";
import {createFactory as $, Component, DOM, PropTypes} from "react";
import {times} from "lodash";

import Line from "../private/views/line";
import {bravura} from "../private/smufl";

export interface IProps {
    key?: string | number;
    width: number;
    staffDetails: StaffDetails;
    defaultX: number;
    defaultY: number;
}

/**
 * Renders the (usually 5) lines that make up a staff.
 */
export default class StaffLines extends Component<IProps, {}> {
    static contextTypes = {
        originY: PropTypes.number.isRequired
    } as any;

    context: {
        originY: number;
    };

    render(): any {
        let middle = this.context.originY - this.props.defaultY;
        let staffDetails = this.props.staffDetails;
        let offset = (staffDetails.staffLines - 1) / 2;
        return DOM.g(null,
            times(staffDetails.staffLines, i => $(Line)({
                key: "staff-" + i,
                stroke: "#6A6A6A",
                // TODO: Use print
                strokeWidth: bravura.engravingDefaults.staffLineThickness * 10,
                x1: this.props.defaultX,
                x2: this.props.defaultX + this.props.width,
                y1: middle - 10 * (i - offset),
                y2: middle - 10 * (i - offset)
            }))
        /* DOM.g */);
    }
}
