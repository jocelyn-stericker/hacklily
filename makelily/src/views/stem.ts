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
import React = require("react");
import invariant = require("react/lib/invariant");
let $ = React.createFactory;

import Line = require("./primitives/line");
import SMuFL = require("../models/smufl");

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
        const offset = SMuFL.getFontOffset(notehead, direction);
        const x = this.context.originX + spec.defaultX +
            (spec.relativeX || (offset[0]*10 + lineXOffset));
        invariant(isFinite(x), "Invalid x offset %s", x);

        return $(Line)({
            x1: x,
            x2: x,
            y1: this.context.originY - spec.defaultY - (spec.relativeY || 0) -
                offset[1]*10,
            y2: this.context.originY - spec.defaultY - (spec.relativeY || 0) -
                offset[1]*10 - this.props.bestHeight*direction,
            stroke: spec.color,
            fill: spec.color,
            strokeWidth: this.props.width
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
    export var contextTypes = <any> {
        originX: React.PropTypes.number.isRequired,
        originY: React.PropTypes.number.isRequired
    };
}

export = Stem;
