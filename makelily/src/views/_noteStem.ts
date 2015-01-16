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
import TypedReact       = require("typed-react");
import PureRenderMixin  = require("react/lib/ReactComponentWithPureRenderMixin");

import C                = require("../stores/contracts");
import _Line            = require("./_line");
import getFontOffset    = require("./_getFontOffset");

var    Line             = React.createFactory(_Line.Component);

var stemThickness: number = C.SMuFL.bravuraMetadata.engravingDefaults.stemThickness*10;

/**
 * Renders a stem based on a height decided in Note.
 */
class NoteStem extends TypedReact.Component<NoteStem.IProps, {}> {
    render() {
        var fontOffsetX = this.getFontOffset()[0] * (this.props.grace ? 0.6 : 1.0);
        var fontOffsetY = this.getFontOffset()[1];
        return Line({
            x1: this.props.x + fontOffsetX*10 + this.lineXOffset(),
            x2: this.props.x + fontOffsetX*10 + this.lineXOffset(),
            y1: this.props.y - fontOffsetY*10 - (this.props.line - 3)*10,
            y2: this.props.y -
                (this.props.line - 3)*10 -
                fontOffsetY*10 -
                this.direction()*this.height(),
            stroke: this.props.stroke,
            strokeWidth: stemThickness
        });
    }

    height() {
        return this.props.height;
    }

    direction() {
        return this.props.direction;
    }

    lineXOffset() {
        return this.direction() * - stemThickness/2;
    }

    private getFontOffset: (field?: string) => number[] = getFontOffset;

    getDefaultProps() {
        return {
            x: 0,
            y: 0,
            height: 3.5,
            stroke: "#000000"
        };
    }
}

module NoteStem {
    export var Component = TypedReact.createClass(NoteStem, <any> [PureRenderMixin]);

    export interface IProps {
        height: number;
        direction: number; // -1 or 1
        line: number;
        notehead: string;
        grace: C.MusicXML.Grace;
        stroke: string;
        x: number;
        y: number;
    }
}

export = NoteStem;
