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

import MusicXML         = require("musicxml-interfaces");
import React            = require("react");

import Line             = require("./primitives/line");
import Glyph            = require("./primitives/glyph");
import SMuFL            = require("../models/smufl");
var $                   = React.createFactory;

const BRACE_H_SCALE = 2.9;

/**
 * Renders a piano bracket or other kind of brace.
 */
class PartSymbol extends React.Component<PartSymbol.IProps, void> {
    render() {
        if (this.props.spec.type === MusicXML.PartSymbolType.None) {
            return null;
        }

        const defaults = SMuFL.bravura.engravingDefaults; // TODO: Use 'print'

        const height = this.context.systemBottom - this.context.systemTop;
        const bottom = this.context.systemBottom;

        let symbol = this.getSymbol();
        return React.DOM.g(null,
            symbol,
            $(Line)({
                stroke: "#000000",
                strokeWidth: defaults.thinBarlineThickness*10,
                key: "line",
                x1: this.context.originX + this.props.spec.defaultX,
                x2: this.context.originX + this.props.spec.defaultX,
                y1: bottom - height,
                y2: bottom
            })
        /* React.DOM.g */);
    }

    getSymbol(): any {
        const spec = this.props.spec;

        const height = this.context.systemBottom - this.context.systemTop;
        const bottom = this.context.systemBottom;

        const defaults = SMuFL.bravura.engravingDefaults; // TODO: Use 'print'

        const x = this.context.originX + this.props.spec.defaultX - 14;

        const s = height/40;

        switch (spec.type) {
            case MusicXML.PartSymbolType.Brace:
                return $(Glyph)({
                    transform: "scale(" + BRACE_H_SCALE + "," + s + ")" +
                        "translate(" + (-x*(1-1/(BRACE_H_SCALE))) + "," +
                        -(1-1/s)*bottom + ")",
                    fill: "#000000",
                    key: "partSymbolMain",
                    x: x,
                    y: bottom,
                    glyphName: "brace"
                });
            case MusicXML.PartSymbolType.Bracket:
            case MusicXML.PartSymbolType.Square: // TODO: Not implemented
                return [
                    $(Line)({
                        stroke: "#000000",
                        strokeWidth: defaults.bracketThickness*10,
                        key: "partSymbolMain",
                        x1: x + 4 + 2.5,
                        x2: x + 4 + 2.5,
                        y1: bottom - height - 2 - 3,
                        y2: bottom + 2 + 3
                    }),
                    $(Glyph)({
                        fill: "#000000",
                        key: "bracketTop",
                        x: x + 4,
                        y: this.context.systemTop - 2,
                        glyphName: "bracketTop"
                    }),
                    $(Glyph)({
                        fill: "#000000",
                        key: "bracketBottom",
                        x: x + 4,
                        y: this.context.systemBottom + 2,
                        glyphName: "bracketBottom"
                    })
                ];
            case MusicXML.PartSymbolType.Line:
                return null;
        }
    }
}

module PartSymbol {
    export interface IProps {
        spec: MusicXML.PartSymbol;
    }

    export var contextTypes = <any> {
        originX:        React.PropTypes.number.isRequired,
        originY:        React.PropTypes.number.isRequired,
        systemTop:      React.PropTypes.number.isRequired,
        systemBottom:   React.PropTypes.number.isRequired
    };
}

export = PartSymbol;
