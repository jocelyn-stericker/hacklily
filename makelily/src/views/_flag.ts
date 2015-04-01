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

import React                = require("react");
import TypedReact           = require("typed-react");
import assert               = require("assert");
import PureRenderMixin      = require("react/lib/ReactComponentWithPureRenderMixin");

import C                    = require("../stores/contracts");
import _Glyph               = require("./_glyph");
import getFontOffset        = require("./_getFontOffset");

var    Glyph                = React.createFactory(_Glyph.Component);

export var countToFlag: { [key: string]: string } = {
    8: "flag8th",
    16: "flag16th",
    32: "flag32nd",
    64: "flag64th",
    128: "flag128th",
    256: "flag256th",
    512: "flag512th",
    1024: "flag1024th"
};

/**
 * Responsible for rendering the "flag" on un-beamed notes shorter than quarter notes.
 */
class Flag extends TypedReact.Component<Flag.IProps, {}> {
    render() {
        var xscale = this.props.grace ? 0.6 : 1.0;
        var fontOffsetX = this.getFontOffset(this.glyphName())[0] * xscale;
        var noteOffsetX = this.getFontOffset()[0] * xscale;
        var noteOffsetY = this.getFontOffset()[1];
        return Glyph({
            x: this.props.x +
                fontOffsetX*10 +
                ((this.props.direction === 1) ?
                    noteOffsetX*10 - this.props.stemWidth :
                    0),
            y: this.props.y -
                (this.props.line - 3)*10 -
                noteOffsetY*10 -
                this.direction()*this.props.stemHeight,
            fill: this.props.stroke,
            scale: this.props.grace ? 0.6 : 1.0,
            glyphName: this.glyphName()
        });
    }

    directionString() {
        if (this.direction() === 1) {
            return "Up";
        } else if (this.direction() === -1) {
            return "Down";
        }

        assert(false, "Invalid direction");
    }
    direction() {
        return this.props.direction;
    }
    glyphName() {
        return this.props.flag + this.directionString();
    }

    private getFontOffset: (field?: string) => number[] = getFontOffset;

    getDefaultProps() {
        return {
            x: 0,
            y: 0,
            line: 3
        };
    }
}

module Flag {
    export var Component = TypedReact.createClass(Flag, <any> [PureRenderMixin]);

    export interface IProps {
        direction: number; // -1 or 1
        flag: string;
        line: number;
        notehead: string;
        stemHeight: number;
        stemWidth: number;
        stroke: string;
        grace: C.MusicXML.Grace;
        x: number;
        y: number;
    };
}

export = Flag;
