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
import _Glyph           = require("./_glyph");

var Glyph               = React.createFactory(_Glyph.Component);

/**
 * Renders an accidental centered at (x, y) on line 'line'.
 * Position adjustments of accidentals should be taken care of by DurationModel.
 */
class Accidental extends TypedReact.Component<Accidental.IProps, {}> {
    render(): any {
        var accidental = Glyph({
            x: this.props.x,
            y: this.props.y - (this.props.line - 3)*10,
            fill: this.props.stroke,
            scale: this.props.grace ? 0.6 : 1.0,
            opacity: this.props.opacity,
            glyphName: this.props.accidental,
            "selection-info": "accidental-" + this.props.idx
        });

        if (this.props.paren) {
            var width = C.SMuFL.bravuraBBoxes[this.props.accidental][0]*10;
            return React.DOM.g(null,
                Glyph({
                        x: this.props.x - 7,
                        y: this.props.y - (this.props.line - 3)*10,
                        glyphName: "accidentalParensLeft",
                        fill: "#000000"}),
                accidental,
                Glyph({
                        x: this.props.x + width,
                        y: this.props.y - (this.props.line - 3)*10,
                        glyphName: "accidentalParensRight",
                        fill: "#000000" })
            /* React.DOM.g */);
        } else {
            return accidental;
        }
    }
}

module Accidental {
    export var Component = TypedReact.createClass(Accidental, <any> [PureRenderMixin]);

    export interface IProps {
        accidental: string;
        opacity?: number;
        idx?: number;
        paren?: boolean;
        grace?: C.MusicXML.Grace;
        line: number;
        stroke?: string;
        x: number;
        y: number;
    }
}

export = Accidental;
