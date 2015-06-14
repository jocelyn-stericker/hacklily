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
import _ = require("lodash");
var $ = React.createFactory;

import IAttributes = require("../models/engine/iattributes");
import Glyph = require("./primitives/glyph");

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
        if (ts.singleNumber && ts.beats.length === 1 && ts.beats[0].length === 1) {
            return $(TimeSignatureNumber)({
                    stroke: spec.color,
                    x: this.context.originX + spec.defaultX + (spec.relativeX || 0),
                    y: this.context.originY - (spec.defaultY + (spec.relativeY || 0))
                },
                ts.beats[0]
            );
        }

        if (ts.commonRepresentation) {
            var beats = ts.beats;
            var beatType = ts.beatType;

            let hasSingleBeat = beats.length === 1 && beats[0].length === 1;

            let isCommon = hasSingleBeat && beats[0][0] === 4 && beatType[0] === 4;
            let isCut = hasSingleBeat && beats[0][0] === 2 && beatType[0] === 2;

            if (isCommon) {
                return $(Glyph)({
                    x: this.context.originX + spec.defaultX + (spec.relativeX || 0),
                    y: this.context.originY - (spec.defaultY + (spec.relativeY || 0)),
                    fill: spec.color,
                    glyphName: "timeSigCommon"
                });
            } else if (isCut) {
                return $(Glyph)({
                    x: this.context.originX + spec.defaultX + (spec.relativeX || 0),
                    y: this.context.originY - (spec.defaultY + (spec.relativeY || 0)),
                    fill: spec.color,
                    glyphName: "timeSigCutCommon"
                });
            }
            // Cannot be represented in common representation. Pass through.
        }

        let numOffsets = this.numOffsets();
        let denOffsets = this.denOffsets();

        let pos = 0;
        return React.DOM.g(null,
            _.map(ts.beats, (beatsOuter, idx) => {
                let array = [
                    _.map(beatsOuter, (beats, jdx) => [
                        $(TimeSignatureNumber)({
                                key: `num_${idx}_${jdx}`,
                                stroke: spec.color,
                                x: this.context.originX + spec.defaultX + (spec.relativeX || 0) +
                                    numOffsets[idx] + pos + jdx * IAttributes.NUMBER_SPACING,
                                y: this.context.originY -
                                    (spec.defaultY + (spec.relativeY || 0) + 10)
                            },
                            beats
                        ),
                        (jdx + 1 !== beatsOuter.length) && $(Glyph)({
                            key: `num_plus_numerator_${idx}_${jdx}`,
                            glyphName: "timeSigPlusSmall",
                            x: this.context.originX + spec.defaultX + (spec.relativeX || 0) +
                                numOffsets[idx] + pos + jdx * IAttributes.NUMBER_SPACING + 17,
                            y: this.context.originY - (spec.defaultY) + (spec.relativeY || 0) - 10,
                            fill: "black"
                        })
                    ]),
                    $(TimeSignatureNumber)({
                            key: "den",
                            stroke: spec.color,
                            x: this.context.originX + spec.defaultX + (spec.relativeX || 0) +
                                denOffsets[idx] + pos,
                            y: this.context.originY - (spec.defaultY + (spec.relativeY || 0) - 10)
                        },
                        ts.beatType[idx]
                    ),
                    (idx + 1 !== ts.beats.length) && $(Glyph)({
                        key: `num_plus_${idx}`,
                        glyphName: "timeSigPlus",
                        x: this.context.originX + spec.defaultX + (spec.relativeX || 0) +
                            numOffsets[idx] + pos +
                            beatsOuter.length*IAttributes.NUMBER_SPACING - 10,
                        y: this.context.originY - (spec.defaultY) + (spec.relativeY || 0),
                        fill: "black"
                    })
                ];
                pos += beatsOuter.length*IAttributes.NUMBER_SPACING + IAttributes.PLUS_SPACING;
                return array;
            })
        /* React.DOM.g */);
    }

    numOffsets() {
        // This is sketchy.
        var ts = this._displayTimeSignature();
        return _.map(ts.beats, (beats, idx) => {
            if (beats.length > 1) {
                return 0;
            }
            let culm = 0;
            if (beats[0] < 10 && ts.beatType[idx] >= 10) {
                culm += 5;
            }
            return culm;
        });
    }
    denOffsets() {
        // This is sketchy.
        var ts = this._displayTimeSignature();

        return _.map(ts.beatType, (beatType, idx) => {
            let culm = 0;
            let numToDenOffset = (ts.beats[idx].length - 1)*IAttributes.NUMBER_SPACING/2;
            culm += numToDenOffset;
            if (ts.beats[idx][0] >= 10 && beatType < 10) {
                culm += 7;
            }

            return culm;
        });
    }

    _displayTimeSignature() {
        const spec = this.props.spec;
        return {
            beats: _.map(spec.beats, beats => beats.split("+").map(n => parseInt(n, 10))),
            beatType: spec.beatTypes,
            commonRepresentation: spec.symbol === MusicXML.TimeSymbolType.Common ||
                                    spec.symbol === MusicXML.TimeSymbolType.Cut,
            singleNumber: spec.symbol === MusicXML.TimeSymbolType.SingleNumber
        };
    }
};

module TimeSignature {
    export var contextTypes = <any> {
        originX: React.PropTypes.number.isRequired,
        originY: React.PropTypes.number.isRequired
    };
}

/* private */
interface ITSNumProps {
    x: number;
    y: number;
    stroke: string;
    children?: string;
};

/* private */
class TimeSignatureNumber extends React.Component<ITSNumProps, void> {
    render() {
        return React.DOM.g(null,
            _.map((this.props.children + "").split(""), (numberString, i) => $(Glyph)({
                key: "ts-" + i,
                x: this.props.x + i*12 + (numberString === "1" ?
                        (!i && parseInt(this.props.children, 10) >= 10 ? -1 : 1) : 0),
                y: this.props.y,
                fill: this.props.stroke,
                glyphName: "timeSig" + numberString
            /* Glyph */}))
        /* React.DOM.g */);
    }
}

export = TimeSignature;
