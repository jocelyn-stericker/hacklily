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

import Dot                  = require("./primitives/dot");
import Engine               = require("../models/engine");
import Glyph                = require("./primitives/glyph");
import SMuFL                = require("../models/smufl");

let countToRest: { [key: number]: string } = {
    [MusicXML.Count.Maxima]:    "restLonga",
    [MusicXML.Count.Long]:      "restLonga",
    [MusicXML.Count.Breve]:     "restDoubleWhole",
    [MusicXML.Count.Whole]:     "restWhole",
    [MusicXML.Count.Half]:      "restHalf",
    [MusicXML.Count.Quarter]:   "restQuarter",
    [MusicXML.Count.Eighth]:    "rest8th",
    [MusicXML.Count._16th]:     "rest16th",
    [MusicXML.Count._32nd]:     "rest32nd",
    [MusicXML.Count._64th]:     "rest64th",
    [MusicXML.Count._128th]:    "rest128th",
    [MusicXML.Count._256th]:    "rest256th",
    [MusicXML.Count._512th]:    "rest512th",
    [MusicXML.Count._1024th]:   "rest1024th"
};

/**
 * Renders a rest.
 */
class Rest extends React.Component<{
        spec: MusicXML.Note, multipleRest?: MusicXML.MultipleRest}, void> {
    render() {
        const spec = this.props.spec;
        const rest = spec.rest;
        invariant(!!spec.rest, "Attempting to render a non-rest with Rest");
        const notehead = countToRest[spec.noteType.duration];

        const bbox = SMuFL.bboxes[notehead];
        const width = (bbox[0] - bbox[2])*10;
        const x = this.context.originX + spec.defaultX + (spec.relativeX || 0);
        const y = this.context.originY - (spec.defaultY + (spec.relativeY || 0));
        const dotOffset = SMuFL.bboxes[notehead][0]*10 + 6;

        return React.DOM.g(null,
            $(Glyph)({
                key: "R",
                x: x,
                y: y,
                fill: spec.color,
                glyphName: notehead
            }/* Glyph */),
            rest.measure && this.props.multipleRest && React.DOM.text({
                    x: x,
                    y: y - 30,
                    fontSize: 48,
                    className: "mmn_",
                    textAnchor: "middle"},
                this.props.multipleRest.count   // TODO: useSymbols
            /* React.DOM.text */),
        spec.dots ? _.map(spec.dots, (dot, idx) => $(Dot)({
                key: idx + "d",
                radius: 2.4,
                fill: dot.color,
                x: x + dotOffset + 6*idx,
                y: y - (dot.defaultY + (dot.relativeY || 0))
                // y: y + (line - 3)*10 + (((line * 2) % 2) ? 0 : 5)
            }/* Dot */)): null
        /* React.DOM.g */);
    }
}

module Rest {
    export var contextTypes = <any> {
        originX:            React.PropTypes.number.isRequired,
        originY:            React.PropTypes.number.isRequired
    };
}

export = Rest;
