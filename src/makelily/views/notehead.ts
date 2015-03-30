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

let countToNotehead: { [key: number]: string } = {
    [MusicXML.Count.Maxima]:    "noteheadDoubleWhole",
    [MusicXML.Count.Long]:      "noteheadDoubleWhole",
    [MusicXML.Count.Breve]:     "noteheadDoubleWhole",
    [MusicXML.Count.Whole]:     "noteheadWhole",
    [MusicXML.Count.Half]:      "noteheadHalf",
    [MusicXML.Count.Quarter]:   "noteheadBlack",
    [MusicXML.Count.Eighth]:    "noteheadBlack",
    [MusicXML.Count._16th]:     "noteheadBlack",
    [MusicXML.Count._32nd]:     "noteheadBlack",
    [MusicXML.Count._64th]:     "noteheadBlack",
    [MusicXML.Count._128th]:    "noteheadBlack",
    [MusicXML.Count._256th]:    "noteheadBlack",
    [MusicXML.Count._512th]:    "noteheadBlack",
    [MusicXML.Count._1024th]:   "noteheadBlack"
};

/**
 * Renders a notehead.
 */
class Notehead extends React.Component<{spec: MusicXML.Notehead | MusicXML.Position, duration: MusicXML.Count}, void> {
    render() {
        let spec = this.props.spec;
        let pos = <MusicXML.Position> spec;
        let head = <MusicXML.Notehead> spec;

        return $(Glyph)({
            x: this.context.originX + pos.defaultX + (pos.relativeX || 0),
            y: this.context.originY - pos.defaultY - (pos.relativeY || 0),
            fill: head.color,
            // scale: this.props.grace ? 0.6 : 1.0,
            glyphName: this.getNoteheadGlyph()
        });
    }
    getNoteheadGlyph() {
        let spec = this.props.spec;
        let head = <MusicXML.Notehead> spec;

        if (head.type === MusicXML.NoteheadType.Normal) {
            return countToNotehead[this.props.duration];
        }
        throw new Error("custom noteheads not implemented");
    }
}

module Notehead {
    export var contextTypes = <any> {
        originX:         React.PropTypes.number.isRequired,
        originY:         React.PropTypes.number.isRequired
    };
}

export = Notehead;
