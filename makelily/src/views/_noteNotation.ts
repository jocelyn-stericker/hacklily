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
import PureRenderMixin      = require("react/lib/ReactComponentWithPureRenderMixin");

import C                    = require("../stores/contracts");
import _Glyph               = require("./_glyph");

var    Glyph                = React.createFactory(_Glyph.Component);

/**
 * Renders annotations like staccato, or accents.
 */
class NoteNotation extends TypedReact.Component<NoteNotation.IProps, {}> {
    render() {
        var offset  = C.SMuFL.bravuraBBoxes[this.props.notehead][0];
        var start   = C.SMuFL.bravuraBBoxes[this.props.notehead][3];
        var o2      = C.SMuFL.bravuraBBoxes[this.glyphName()][3];
        var s2      = C.SMuFL.bravuraBBoxes[this.glyphName()][0];
        return Glyph({
            x:                  this.props.x + this.xOffset() + (offset - start)/4/2 + (o2 - s2)/4/2,
            y:              this.props.y - this.yOffset(),
            fill:           this.glyphIsTemporary() ? "#A5A5A5" : "#000000",
            glyphName:      this.glyphName(),
            glyphIsTemporary:   this.glyphIsTemporary()
        });
    }

    directionString() {
        if (C.SMuFL.bravuraBBoxes[this.notationName()]) {
            return "";
        } else if (this.direction() === 1) {
            return "Below";
        } else if (this.direction() === -1) {
            return "Above";
        }
    }
    shouldBeAboveStaff() {
        var above = ["fermata", "breathMark", "caesura", "strings"];
        for (var i = 0; i < above.length; ++i) {
            if (this.notationName().indexOf(above[i]) === 0) {
                return true;
            }
        }
        return false;
    }
    shouldBeBelowStaff() {
        var below = ["dynamic"];
        for (var i = 0; i < below.length; ++i) {
            if (this.notationName().indexOf(below[i]) === 0) {
                return true;
            }
        }
        return false;
    }
    glyphIsTemporary() {
        return false; // MXFIX
        // return this.props.notation.substr(0, 2) === "__";
    }
    glyphName() {
        return this.notationName() + this.directionString();
    }
    notationName() {
        return ""; // MXFIX
        // var isTmp = this.glyphIsTemporary();
        // return isTmp ? this.props.notation.substring(2) : this.props.notation;
    }
    direction() {
        if (this.shouldBeAboveStaff()) {
            return -1;
        }
        return this.props.direction;
    }
    xOffset() {
        // MXFIX
        // if (this.props.notation.indexOf("caesura") === 0) {
        //     return -3/8; // TODO -- move to DurationModel and fix
        // } else if (this.props.notation.indexOf("breathMarkComma") === 0) {
        //     return 3/8; // TODO -- move to DurationModel and fix
        // }
        return 0;
    }
    yOffset() {
        var m: number;
        if (this.shouldBeAboveStaff()) {
            m = (6.0 + this.props.idx - 3)/4;
            if (m + 1.5 <= this.props.line/4) {
                m = (this.props.line)/4 + 1.5;
            }
            return m;
        } else if (this.shouldBeBelowStaff()) {
            m = (-1.5 + this.props.idx - 3)/4;
            if (m + 1.5 >= this.props.line/4) {
                m = (this.props.line)/4 - 1.5;
            }
            return m;
        }

        if (this.direction() === 1) {
            return (this.props.line - 1.2 - (this.props.line % 1 && this.props.line - 1.2 > 0 ? 0.4 : 0) - this.props.idx - 3)/4;
        }

        return (this.props.line + 1.2 + (this.props.line % 1  && this.props.line + 1.2 < 5 ? 0.4 : 0) + this.props.idx - 3)/4;
    }
}

module NoteNotation {
    export var Component = TypedReact.createClass(NoteNotation, <any> [PureRenderMixin]);

    export interface IProps {
        direction: number; // -1 or 1
        idx: number;
        line: number;
        notation: C.MusicXML.Notations;
        notehead: string;
        x: number;
        y: number;
    }
}

export = NoteNotation;
