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

import MusicXML = require("musicxml-interfaces");
import * as React from "react"; // TS 1.5 workaround
import {createFactory as $, PropTypes} from "react";
import invariant = require("react/lib/invariant");

import Line from "./primitives/line";
import {getFontOffset} from "../models/smufl";

/**
 * Renders a stem based on a height decided in Note.
 */
class Stem extends React.Component<Stem.IProps, void> {
    render() {
        const notehead = this.props.notehead;
        const spec = this.props.spec;
        if (spec.type === MusicXML.StemType.Double) {
            return null;
        }
        const direction = spec.type === MusicXML.StemType.Up ? 1 : -1; // TODO: StemType.Double
        const lineXOffset = direction * - this.props.width/2;
        const offset = getFontOffset(notehead, direction);
        const x = this.context.originX + spec.defaultX +
            (spec.relativeX || (offset[0]*10 + lineXOffset));
        invariant(isFinite(x), "Invalid x offset %s", x);

        return $(Line)({
            fill: spec.color,
            stroke: spec.color,
            strokeWidth: this.props.width,
            x1: x,
            x2: x,
            y1: this.context.originY - spec.defaultY - (spec.relativeY || 0) -
                offset[1]*10,
            y2: this.context.originY - spec.defaultY - (spec.relativeY || 0) -
                offset[1]*10 - this.props.bestHeight*direction
        });
    }
}

module Stem {
    export interface IProps {
        spec: MusicXML.Stem;
        notehead: string;
        bestHeight: number;
        width: number;
    }
    export let contextTypes = <any> {
        originX: PropTypes.number.isRequired,
        originY: PropTypes.number.isRequired
    };
}

export default Stem;
