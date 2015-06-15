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

import * as React from "react"; // TS 1.5 workaround
import {createFactory as $, PropTypes} from "react";
import invariant = require("react/lib/invariant");

import Glyph from "./primitives/glyph";
import {getFontOffset} from "../models/smufl";

/**
 * Responsible for rendering the "flag" on un-beamed notes shorter than quarter notes.
 */
class Flag extends React.Component<Flag.IProps, void> {
    render() {
        const spec = this.props.spec;
        const context = this.context;

        let xscale = this.props.isGrace ? 0.6 : 1.0;
        let dir = spec.direction;
        let fontOffsetX = getFontOffset(this.glyphName(), dir)[0] * xscale;
        let noteOffsetX = getFontOffset(this.props.notehead, dir)[0] * xscale;
        let noteOffsetY = getFontOffset(this.props.notehead, dir)[1] * 10;
        return $(Glyph)({
            fill: spec.color,
            glyphName: this.glyphName(),
            scale: this.props.isGrace ? 0.6 : 1.0,
            x: context.originX + spec.defaultX +
                fontOffsetX*10 +
                ((dir === 1) ? noteOffsetX*10 - this.props.stemWidth : 0),
            y: context.originY - spec.defaultY - noteOffsetY*4
        });
    }

    directionString() {
        if (this.props.spec.direction === 1) {
            return "Up";
        } else if (this.props.spec.direction === -1) {
            return "Down";
        }

        invariant(false, "Invalid direction");
    }
    glyphName() {
        return this.props.spec.flag + this.directionString();
    }
}

module Flag {
    export let contextTypes = <any> {
        originX: PropTypes.number.isRequired,
        originY: PropTypes.number.isRequired
    };
    export interface IProps {
        spec: {
            defaultX: number;
            defaultY: number;
            color: string;
            flag: string;
            direction: number;
        };
        isGrace?: boolean;
        notehead: string;
        stemWidth: number;
        stemHeight: number;
    };
}

export default Flag;
