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

import {PrintStyle} from "musicxml-interfaces";
import {createFactory as $, Component, PropTypes} from "react";

import Line from "../private/views/line";
import {bboxes} from "../private/smufl";

export interface IProps {
    key?: string | number;
    spec: PrintStyle;
    notehead: string;
}

/**
 * Renders a ledger line at (x, y + line).
 */
export default class LedgerLine extends Component<IProps, void> {
    static contextTypes = {
        originY: PropTypes.number.isRequired
    } as any;

    context: {
        originY: number;
    };

    render(): any {
        const spec = this.props.spec;
        const west = bboxes[this.props.notehead][3];
        const east = bboxes[this.props.notehead][0];
        const xOffset = (east - west) * 10;
        return $(Line)({
            stroke: spec.color,
            strokeWidth: 2.2,
                // Ledger lines should be thicker than regular lines.
            x1: spec.defaultX + (spec.relativeX || 0) - 3.2,
            x2: spec.defaultX + (spec.relativeX || 0) + xOffset - 0.2,
            y1: this.context.originY - spec.defaultY - (spec.relativeX || 0),
            y2: this.context.originY - spec.defaultY - (spec.relativeX || 0)
        });
    }
}
