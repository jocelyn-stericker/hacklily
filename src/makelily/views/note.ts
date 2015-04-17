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

import MusicXML             = require("musicxml-interfaces");
import React                = require("react");
import _                    = require("lodash");
import invariant            = require("react/lib/invariant");
let $                       = React.createFactory;

import Accidental           = require("./accidental");
import Dot                  = require("./primitives/dot");
import Notehead             = require("./notehead");
import SMuFL                = require("../models/smufl");

class Note extends React.Component<{spec: MusicXML.Note}, void> {
    render() {
        const spec = this.props.spec;
        const pitch = spec.pitch;

        let approxNotehead = Notehead.countToNotehead[spec.noteType.duration];
        var width = SMuFL.bboxes[approxNotehead][0]*10;

        invariant(!!pitch, "Not implemented");

        return React.DOM.g(null,
            $(Notehead)({
                key: "h",
                spec: {
                    defaultX: 0,
                    defaultY: 0,
                    color: spec.color,
                    type: MusicXML.NoteheadType.Normal // FIXME
                },
                duration: spec.noteType.duration
            }),
            spec.dots ? _.map(spec.dots, (dot, idx) => $(Dot)({
                key: "_1_" + idx,
                fill: dot.color,
                radius: 2.4,
                x: this.context.originX + this.props.spec.defaultX + width + 6 + 6*idx,
                y: this.context.originY - (dot.defaultY + (dot.relativeY || 0))
            })) : null,
            this.props.spec.accidental ? $(Accidental)({
                key: "a",
                spec: this.props.spec.accidental
            }) : null
        /* React.DOM.g */);
    }

    getChildContext() {
        return {
            originX:        this.context.originX + this.props.spec.defaultX,
            originY:        this.context.originY - this.props.spec.defaultY
        };
    }
};

module Note {
    export var childContextTypes = <any> {
        originX:            React.PropTypes.number.isRequired,
        originY:            React.PropTypes.number.isRequired
    };
    export var contextTypes = <any> {
        originX:         React.PropTypes.number.isRequired,
        originY:         React.PropTypes.number.isRequired
    };
}

export = Note;
