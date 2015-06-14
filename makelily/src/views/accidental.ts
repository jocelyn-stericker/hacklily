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
var $ = React.createFactory;

import Glyph = require("./primitives/glyph");
import IChord = require("../models/engine/ichord");
import SMuFL = require("../models/smufl");

class Accidental extends React.Component<{spec: MusicXML.Accidental}, void> {
    render(): any {
        let spec = this.props.spec;
        const glyphName = IChord.accidentalGlyphs[this.props.spec.accidental];
        invariant(glyphName in SMuFL.bboxes, "Expected a glyph, got %s", glyphName);

        const originX = this.context.originX;
        const originY = this.context.originY;
        const shift = spec.parentheses ? 4 : 0;

        var accidental = $(Glyph)({
            x: originX + spec.defaultX + (spec.relativeX || 0) + shift,
            y: originY - (spec.defaultY + (spec.relativeY || 0)),
            fill: spec.color,
            glyphName: glyphName
        });

        if (spec.parentheses || spec.bracket) {
            var width = SMuFL.bboxes[glyphName][0]*10; // TODO: it's actually 2 - 0!
            return React.DOM.g(null,
                $(Glyph)({
                        x: originX + spec.defaultX + (spec.relativeX || 0) - 7 + shift,
                        y: originY - (spec.defaultY + (spec.relativeY || 0)),
                        glyphName: "accidentalParensLeft",
                        fill: "#000000"}),
                accidental,
                $(Glyph)({
                        x: originX + spec.defaultX + (spec.relativeX || 0) + width + shift,
                        y: originY - (spec.defaultY + (spec.relativeY || 0)),
                        glyphName: "accidentalParensRight",
                        fill: "#000000" })
            /* React.DOM.g */);
        } else {
            return accidental;
        }
    }
}

module Accidental {
    export var contextTypes = <any> {
        originX: React.PropTypes.number.isRequired,
        originY: React.PropTypes.number.isRequired
    };
}

export = Accidental;
