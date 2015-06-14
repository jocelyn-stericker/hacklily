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

import IBeam = require("../models/engine/ibeam");
import Glyph = require("./primitives/glyph");
import SMuFL = require("../models/smufl");

/**
 * Renders a beam based on a computed layout.
 */
class Beam extends React.Component<Beam.IProps, void> {
    render() {
        let xLow = this._getX1();
        let xHi = this._getX2();
        let layout = this.props.layout;

        return React.DOM.g(null,
            _.map(layout.beamCount, (beams: number, idx: number): any => {
                if (idx === 0) {
                    return null;
                }
                return _.times(beams, beam => {
                    var x1: number;
                    var x2: number = this._withXOffset(layout.x[idx]);
                    if (layout.beamCount[idx - 1] <= beam) {
                        if (layout.x[idx + 1] &&
                            layout.beamCount[idx + 1] === beams) {
                            return null;
                        }
                        x1 = this._withXOffset((layout.x[idx - 1] + layout.x[idx] * 3) / 4);
                    } else {
                        x1 = this._withXOffset(layout.x[idx - 1]);
                    }
                    return React.DOM.polygon({
                        key: idx + "_" + beam,
                        points: x1 + "," +
                            this._getYVar(0, beam, (x1 - xLow)/(xHi - xLow)) + " " +
                            x2 + "," +
                            this._getYVar(0, beam, (x2 - xLow)/(xHi - xLow)) + " " +
                            x2 + "," +
                            this._getYVar(1, beam, (x2 - xLow)/(xHi - xLow)) + " " +
                            x1 + "," +
                            this._getYVar(1, beam, (x1 - xLow)/(xHi - xLow)),
                        stroke: this.props.stroke,
                        fill: this.props.stroke,
                        strokeWidth: 0
                    });
                });
            }),
            this._tuplet()
        /* React.DOM.g */);
    }

    /**
     * Offset because the note-head has a non-zero width.
     */
    getLineXOffset() {
        return this.props.layout.direction * -this.props.stemWidth / 2;
    }

    private _withXOffset(x: number) {
        // Note that we use notehadBlack regardless of the notehead.
        // This keeps spacing consistent, even in beam groups with rests.

        return x +
            this.context.originX +
            SMuFL.getFontOffset("noteheadBlack", this.props.layout.direction)[0]*10 +
            this.getLineXOffset();
    }

    private _getX1() {
        return this._withXOffset(this.props.layout.x[0]);
    }

    private _getX2() {
        return this._withXOffset(this.props.layout.x[this.props.layout.x.length - 1]);
    }

    private _getY1(incl: number, idx: number) {
        // Note that we use notehadBlack regardless of the notehead.
        // This keeps spacing consistent, even in beam groups with rests.
        return this.context.originY -
            this.props.layout.y1 -
            this._getYOffset() +
            this.props.layout.direction*idx*8.8 -
            // TODO: use print defaults
            (incl || 0)*(SMuFL.bravura.engravingDefaults.beamThickness*10);
    }

    private _getY2(incl: number, idx: number) {
        // Note that we use notehadBlack regardless of the notehead.
        // This keeps spacing consistent, even in beam groups with rests.
        return this.context.originY -
            this.props.layout.y2 -
            this._getYOffset() +
            this.props.layout.direction*idx*8.8 -
            (incl || 0)*(SMuFL.bravura.engravingDefaults.beamThickness*10);
    }

    private _getYVar(incl: number, idx: number, percent: number) {
        var y1 = this._getY1(incl, idx);
        var y2 = this._getY2(incl, idx);
        return (1 - percent) * y1 + percent * y2;
    }

    /**
     * Offset because the note-head has a non-zero height.
     * The note-head is NOT CENTERED at its local origin.
     */
    private _getYOffset() {
        return -3;
    }

    /**
     * Returns a React component instance showing the tuplet number
     */
    private _tuplet() {
        if (!this.props.tuplet) {
            return null;
        } else {
            let segments = this.props.layout.beamCount.length;
            var offset = this._getX2() - this._getX1();
            var y = (this._getY1(1, segments - 1) +
                        this._getY2(1, segments - 1))/2 -
                    (4 + 8*1/* FIXME: get max */)*this.props.layout.direction + 5.2;

            // TODO: all tuplets are drawn as triplets.
            return $(Glyph)({
                "selection-info": "beamTuplet",
                fill: this.props.tupletsTemporary ? "#A5A5A5" : "#000000",
                glyphName: "tuplet3",
                x: this.props.layout.x[0] + offset/2,
                y: y
            });
        }
    }
};

module Beam {
    export var contextTypes = <any> {
        originX: React.PropTypes.number.isRequired,
        originY: React.PropTypes.number.isRequired
    };

    export interface IProps {
        layout: IBeam.ILayout;
        stemWidth: number;
        stroke: string;
        tuplet: MusicXML.TimeModification;
        tupletsTemporary: boolean;
    }
}

export = Beam;
