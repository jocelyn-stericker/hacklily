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

/**
 * Renders a notehead.
 */
class Notehead extends React.Component<Notehead.IProps, void> {
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
            return this.props.notehead;
        }
        throw new Error("custom noteheads not implemented");
    }
}

module Notehead {
    export interface IProps {
        spec: MusicXML.Notehead | MusicXML.Position;
        notehead: string;
    }
    export var contextTypes = <any> {
        originX: React.PropTypes.number.isRequired,
        originY: React.PropTypes.number.isRequired
    };
}

export = Notehead;
