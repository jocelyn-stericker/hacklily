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

import React            = require("react");
import invariant        = require("react/lib/invariant");
let $                   = React.createFactory;

import Glyph            = require("./primitives/glyph");
import SMuFL            = require("../models/smufl");

/**
 * Responsible for rendering the "flag" on un-beamed notes shorter than quarter notes.
 */
class Flag extends React.Component<Flag.IProps, void> {
    render() {
        const spec = this.props.spec;
        const context = this.context;

        var xscale = this.props.isGrace ? 0.6 : 1.0;
        var dir = spec.direction;
        var fontOffsetX = SMuFL.getFontOffset(this.glyphName(), dir)[0] * xscale;
        var noteOffsetX = SMuFL.getFontOffset(this.props.notehead, dir)[0] * xscale;
        var noteOffsetY = SMuFL.getFontOffset(this.props.notehead, dir)[1] * 10;
        return $(Glyph)({
            x: context.originX + spec.defaultX +
                fontOffsetX*10 +
                ((dir === 1) ? noteOffsetX*10 - this.props.stemWidth : 0),
            y: context.originY - spec.defaultY - noteOffsetY*4,
            fill: spec.color,
            scale: this.props.isGrace ? 0.6 : 1.0,
            glyphName: this.glyphName()
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
    export var contextTypes = <any> {
        originX:         React.PropTypes.number.isRequired,
        originY:         React.PropTypes.number.isRequired
    };
    export interface IProps {
        spec: {
            defaultX: number;
            defaultY: number;
            color: string;
            flag: string;
            direction: number;
        }
        isGrace?: boolean;
        notehead: string;
        stemWidth: number;
        stemHeight: number;
    };
}

export = Flag;
