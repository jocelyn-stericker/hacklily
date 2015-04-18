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
var $                       = React.createFactory;

import Glyph                = require("./primitives/glyph");

/**
 * Renders a simple, compound, or common time signature.
 */
class TimeSignature extends React.Component<{spec: MusicXML.Time}, void> {
    render(): any {
        const spec = this.props.spec;
        if (spec.senzaMisura != null) {
            return null;
        }
        let ts = this._displayTimeSignature();

        if (ts.commonRepresentation) {
            var beats = ts.beats;
            var beatType = ts.beatType;

            if (beats === 4 && beatType === 4) {
                return $(Glyph)({
                    x: this.context.originX + spec.defaultX + (spec.relativeX || 0),
                    y: this.context.originY - (spec.defaultY + (spec.relativeY || 0)),
                    fill: spec.color,
                    glyphName: "timeSigCommon"
                });
            } else if (beats === 2 && beatType === 2) {
                return $(Glyph)({
                    x: this.context.originX + spec.defaultX + (spec.relativeX || 0),
                    y: this.context.originY - (spec.defaultY + (spec.relativeY || 0)),
                    fill: spec.color,
                    glyphName: "timeSigCutCommon"
                });
            }
            // Cannot be represented in common representation. Pass through.
        }
        return React.DOM.g(null,
            $(TimeSignatureNumber)({
                    key: "-5",
                    stroke: spec.color,
                    x: this.context.originX + spec.defaultX + (spec.relativeX || 0) +
                        this.numOffset(),
                    y: this.context.originY - (spec.defaultY + (spec.relativeY || 0) + 10)
                },
                ts.beats
            ),
            $(TimeSignatureNumber)({
                    key: "-6",
                    stroke: spec.color,
                    x: this.context.originX + spec.defaultX + (spec.relativeX || 0) +
                        this.denOffset(),
                    y: this.context.originY - (spec.defaultY + (spec.relativeY || 0) - 10)
                },
                ts.beatType
            )
        /* React.DOM.g */);
    }

    numOffset() {
        // XXX: crazy hack. fix.
        var ts = this._displayTimeSignature();
        if (ts.beats < 10 && ts.beatType >= 10) {
            return 5;
        }
        return 0;
    }
    denOffset() {
        // crazy hack. fix.
        var ts = this._displayTimeSignature();
        if (ts.beatType < 10 && ts.beats >= 10) {
            return 5;
        }
        return 0;
    }

    _displayTimeSignature() {
        const spec = this.props.spec;
        return {
            beats:      parseInt(spec.beats[0], 10),
            beatType:   spec.beatTypes[0],
            commonRepresentation: spec.symbol === MusicXML.TimeSymbolType.Common ||
                spec.symbol === MusicXML.TimeSymbolType.Cut
        };
    }
};

module TimeSignature {
    export var contextTypes = <any> {
        originX:         React.PropTypes.number.isRequired,
        originY:         React.PropTypes.number.isRequired
    };
}

/* private */
interface ITSNumProps {
    x:          number;
    y:          number;
    stroke:     string;
    children?:  string;
};

/* private */
class TimeSignatureNumber extends React.Component<ITSNumProps, void> {
    render() {
        return React.DOM.g(null,
            _.map((this.props.children + "").split(""), (c, i) => $(Glyph)({
                key: "ts-" + i,
                x: this.props.x + i*12,
                y: this.props.y,
                fill: this.props.stroke,
                glyphName: "timeSig" + c
            /* Glyph */}))
        /* React.DOM.g */);
    }
}

export = TimeSignature;
