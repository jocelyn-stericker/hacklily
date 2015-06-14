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
var $ = React.createFactory;

import Glyph = require("./primitives/glyph");
import SMuFL = require("../models/smufl");

/**
 * Responsible for the rendering of a clef.
 */
class Clef extends React.Component<{spec: MusicXML.Clef}, void> {
    render(): any {
        const spec = this.props.spec;

        if (spec.printObject === false) {
            return null;
        }

        let clefX = this.context.originX + spec.defaultX + (spec.relativeX || 0);
        let clefY = this.context.originY - (spec.defaultY + (spec.relativeY || 0) +
            (this.renderedLine() - 3)*10);
        let clefSign = this.sign();

        if (!clefSign) {
            return null;
        }

        let clefGlyph = $(Glyph)({
            x: clefX,
            y: clefY,
            fill: spec.color,
            glyphName: clefSign
        });

        let clefOctaveChange = parseInt(spec.clefOctaveChange, 10);
        let clefDecorations: any[] = [];

        let clefSignBox = SMuFL.bboxes[clefSign];
        let left = clefSignBox[0];
        let top = clefSignBox[1];
        let right = clefSignBox[2];
        let bottom = clefSignBox[3]; // The linter doesn't like destructuring yet :(

        // We want it to actually touch, not just be outside the bbox 
        let bScalingFactor = spec.sign.toUpperCase() === "F" ? 0.7 : 1;
        let topLeftOffset = spec.sign.toUpperCase() === "G" ? left*2 : 0;
        top = -top*10 + clefY;
        bottom = -bottom*10*bScalingFactor + clefY;
        left = left*10 + clefX;
        right = right*10 + clefX;

        let decorativeX = (left + right)/2;
        if (clefOctaveChange === 2) {
            clefDecorations.push($(Glyph)({
                key: "15ma",
                x: decorativeX - (SMuFL.bboxes["clef15"][0]*10 +
                        SMuFL.bboxes["clef15"][2]*10)/2 + topLeftOffset,
                y: top,
                fill: spec.color,
                glyphName: "clef15"
            }));
        } else if (clefOctaveChange === 1) {
            clefDecorations.push($(Glyph)({
                key: "8va",
                x: decorativeX - (SMuFL.bboxes["clef8"][0]*10 +
                        SMuFL.bboxes["clef8"][2]*10)/2 + topLeftOffset,
                y: top,
                fill: spec.color,
                glyphName: "clef8"
            }));
        } else if (clefOctaveChange === -1) {
            clefDecorations.push($(Glyph)({
                key: "8vb",
                x: decorativeX - (SMuFL.bboxes["clef8"][0]*10 + SMuFL.bboxes["clef8"][2]*10)/2,
                y: bottom + SMuFL.bboxes["clef8"][1]*10,
                fill: spec.color,
                glyphName: "clef8"
            }));
        } else if (clefOctaveChange === -2) {
            clefDecorations.push($(Glyph)({
                key: "15mb",
                x: decorativeX - (SMuFL.bboxes["clef15"][0]*10 + SMuFL.bboxes["clef15"][2]*10)/2,
                y: bottom + SMuFL.bboxes["clef15"][1]*10,
                fill: spec.color,
                glyphName: "clef15"
            }));
        }
        if (clefDecorations) {
            return React.DOM.g(null,
                clefGlyph,
                clefDecorations);
        } else {
            return clefGlyph;
        }
    }

    sign() {
        const clef = this.props.spec.sign.toLowerCase();

        if (clef === "percussion") {
            return "unpitchedPercussionClef1";
        } else if (clef === "tab") {
            return "6stringTabClef";
        } else if (clef === "none") {
            return null;
        } else {
            return clef + "Clef" + (this.props.spec.size === MusicXML.SymbolSize.Cue ?
                "Change" : "");
        }
    }

    renderedLine(): number {
        // The TAB glyph is higher than expected.
        if (this.props.spec.sign.toLowerCase() === "tab") {
            return this.props.spec.line - 2;
        }
        return this.props.spec.line;
    }
};

module Clef {
    export var contextTypes = <any> {
        originX: React.PropTypes.number.isRequired,
        originY: React.PropTypes.number.isRequired
    };
}

export = Clef;
