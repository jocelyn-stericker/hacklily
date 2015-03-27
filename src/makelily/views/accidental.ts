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
var $                   = React.createFactory;

import Glyph            = require("./primitives/glyph");
import SMuFL            = require("../models/smufl");

class Accidental extends React.Component<{spec: MusicXML.Accidental}, void> {
    render(): any {
        let spec = this.props.spec;
        const glyphName = this.glyphName();
        var accidental = $(Glyph)({
            x: spec.defaultX + (spec.relativeX || 0),
            y: this.context.pageHeight - (spec.defaultY + (spec.relativeY || 0)),
            fill: spec.color,
            glyphName: glyphName
        });

        if (spec.parentheses || spec.bracket) {
            var width = SMuFL.bboxes[glyphName][0]*10;
            return React.DOM.g(null,
                $(Glyph)({
                        x: spec.defaultX + (spec.relativeX || 0) - 7,
                        y: this.context.pageHeight - (spec.defaultY + (spec.relativeY || 0)),
                        glyphName: "accidentalParensLeft",
                        fill: "#000000"}),
                accidental,
                $(Glyph)({
                        x: spec.defaultX + (spec.relativeX || 0) + width,
                        y: this.context.pageHeight - (spec.defaultY + (spec.relativeY || 0)),
                        glyphName: "accidentalParensRight",
                        fill: "#000000" })
            /* React.DOM.g */);
        } else {
            return accidental;
        }
    }
    glyphName() {
        switch (this.props.spec.accidental) {
            case MusicXML.MxmlAccidental.NaturalFlat:
                return "accidentalSharp";
            case MusicXML.MxmlAccidental.SharpUp:
                return "accidentalSharp";
            case MusicXML.MxmlAccidental.ThreeQuartersFlat:
                return "accidentalSharp";
            case MusicXML.MxmlAccidental.ThreeQuartersSharp:
                return "accidentalSharp";
            case MusicXML.MxmlAccidental.QuarterFlat:
                return "accidentalSharp";
            case MusicXML.MxmlAccidental.Flat:
                return "accidentalFlat";
            case MusicXML.MxmlAccidental.TripleSharp:
                return "accidentalSharp";
            case MusicXML.MxmlAccidental.Flat1:
                return "accidentalSharp";
            case MusicXML.MxmlAccidental.Flat2:
                return "accidentalSharp";
            case MusicXML.MxmlAccidental.Flat3:
                return "accidentalSharp";
            case MusicXML.MxmlAccidental.Flat4:
                return "accidentalSharp";
            case MusicXML.MxmlAccidental.TripleFlat:
                return "accidentalSharp";
            case MusicXML.MxmlAccidental.Flat5:
                return "accidentalSharp";
            case MusicXML.MxmlAccidental.Sharp:
                return "accidentalSharp";
            case MusicXML.MxmlAccidental.QuarterSharp:
                return "accidentalSharp";
            case MusicXML.MxmlAccidental.SlashFlat:
                return "accidentalSharp";
            case MusicXML.MxmlAccidental.FlatDown:
                return "accidentalSharp";
            case MusicXML.MxmlAccidental.NaturalDown:
                return "accidentalSharp";
            case MusicXML.MxmlAccidental.SlashQuarterSharp:
                return "accidentalSharp";
            case MusicXML.MxmlAccidental.SharpSharp:
                return "accidentalSharp";
            case MusicXML.MxmlAccidental.Sharp1:
                return "accidentalSharp";
            case MusicXML.MxmlAccidental.FlatUp:
                return "accidentalSharp";
            case MusicXML.MxmlAccidental.Sharp2:
                return "accidentalSharp";
            case MusicXML.MxmlAccidental.Sharp3:
                return "accidentalSharp";
            case MusicXML.MxmlAccidental.DoubleSharp:
                return "accidentalDoubleSharp";
            case MusicXML.MxmlAccidental.Sharp4:
                return "accidentalSharp";
            case MusicXML.MxmlAccidental.Sharp5:
                return "accidentalSharp";
            case MusicXML.MxmlAccidental.Sori:
                return "accidentalSharp";
            case MusicXML.MxmlAccidental.DoubleSlashFlat:
                return "accidentalSharp";
            case MusicXML.MxmlAccidental.SharpDown:
                return "accidentalSharp";
            case MusicXML.MxmlAccidental.Koron:
                return "accidentalSharp";
            case MusicXML.MxmlAccidental.NaturalUp:
                return "accidentalSharp";
            case MusicXML.MxmlAccidental.SlashSharp:
                return "accidentalSharp";
            case MusicXML.MxmlAccidental.NaturalSharp:
                return "accidentalSharp";
            case MusicXML.MxmlAccidental.FlatFlat:
                return "accidentalSharp";
            case MusicXML.MxmlAccidental.Natural:
                return "accidentalNatural";
            case MusicXML.MxmlAccidental.DoubleFlat:
                return "accidentalDoubleFlat";
        }
    }
}

module Accidental {
    export var contextTypes = <any> {
        pageHeight:         React.PropTypes.number.isRequired
    };
}

export = Accidental;
