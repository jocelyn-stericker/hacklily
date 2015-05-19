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

import React            = require("react");
import TypedReact       = require("typed-react");
import _                = require("lodash");
import PureRenderMixin  = require("react/lib/ReactComponentWithPureRenderMixin");

import C                = require("../stores/contracts");
import _Glyph           = require("./_glyph");
import getFontOffset    = require("./_getFontOffset");

var Glyph               = React.createFactory(_Glyph.Component);

/**
 * Calculates a way to render a beam given two endpoints.
 * See also BeamGroup and BeamGroupModel.
 */
class Beam extends TypedReact.Component<Beam.IProps, {}> {
    render() {
        if (this.props.beams === C.BeamCount.Variable) {
            var xLow = this._getX1();
            var xHi = this._getX2();

            return React.DOM.g(null,
                _.map(this.props.variableBeams, (beams: number, idx: number): any => {
                    if (idx === 0) {
                        return null;
                    }
                    return _.times(beams, beam => {
                        var x1: number;
                        var x2: number = this._withXOffset(this.props.variableX[idx]);
                        if (this.props.variableBeams[idx - 1] <= beam) {
                            if (this.props.variableX[idx + 1] &&
                                this.props.variableBeams[idx + 1] === beams) {
                                return null;
                            }
                            x1 = this._withXOffset((this.props.variableX[idx - 1] + this.props.variableX[idx] * 3) / 4);
                        } else {
                            x1 = this._withXOffset(this.props.variableX[idx - 1]);
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
        } else {
            return React.DOM.g(null,
                _.times(this.props.beams, idx =>
                    React.DOM.polygon({
                        key: "" + idx,
                        points: this._getX1() + "," + this._getY1(0, idx) + " " +
                            this._getX2() + "," + this._getY2(0, idx) + " " +
                            this._getX2() + "," + this._getY2(1, idx) + " " +
                            this._getX1() + "," + this._getY1(1, idx),
                        stroke: this.props.stroke,
                        fill: this.props.stroke,
                        strokeWidth: 0})
                ),
                this._tuplet()
            /* React.DOM.g */);
        }
    }

    /**
     * Offset because the note-head has a non-zero width.
     */
    getLineXOffset() {
        return this.direction() * -this.props.stemWidth / 2;
    }

    /**
     *  1 if the notes go up,
     * -1 if the notes go down.
     */
    direction() {
        return this.props.direction;
    }

    private getFontOffset: (field?: string) => number[] = getFontOffset;

    private _withXOffset(x: number) {
        // Note that we use notehadBlack regardless of the notehead.
        // This keeps spacing consistent, even in beam groups with rests.
        return x +
            this.getFontOffset("noteheadBlack")[0]*10 +
            this.getLineXOffset();
    }

    private _getX1() {
        return this._withXOffset(this.props.x);
    }

    private _getX2() {
        return this._withXOffset(this.props.x + this.props.width);
    }

    private _getY1(incl: number, idx: number) {
        // Note that we use notehadBlack regardless of the notehead.
        // This keeps spacing consistent, even in beam groups with rests.
        return this.props.y -
            this._getYOffset() -
            this.direction()*this.getFontOffset("noteheadBlack")[1]*10 -
            (this.props.line1 - 3)*10 +
            this.direction()*idx*8.8 +
            (incl || 0)*(C.SMuFL.bravuraMetadata.engravingDefaults.beamThickness*10);
    }

    private _getY2(incl: number, idx: number) {
        // Note that we use notehadBlack regardless of the notehead.
        // This keeps spacing consistent, even in beam groups with rests.
        return this.props.y -
            this._getYOffset() -
            this.direction()*this.getFontOffset("noteheadBlack")[1]*10 -
            (this.props.line2 - 3)*10 +
            this.direction()*idx*8.8 +
            (incl || 0)*(C.SMuFL.bravuraMetadata.engravingDefaults.beamThickness*10);
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
        if (this.direction() === -1) {
            return 1;
        }
        return 0.2;
    }

    /**
     * Returns a React component instance showing the tuplet number
     */
    private _tuplet() {
        if (!this.props.tuplet) {
            return null;
        } else {
            var offset = this._getX2() - this._getX1();
            var y = (this._getY1(1, this.props.beams - 1) +
                        this._getY2(1, this.props.beams - 1))/2 -
                    (4 + 8*this.props.beams)*this.direction() + 5.2;

            // XXX: all tuplets are drawn as triplets.
            return Glyph({
                "selection-info": "beamTuplet",
                fill: this.props.tupletsTemporary ? "#A5A5A5" : "#000000",
                glyphName: "tuplet3",
                x: this.props.x + offset/2,
                y: y
            });
        }
    }
};

module Beam {
    export var Component = TypedReact.createClass(Beam, <any> [PureRenderMixin]);

    export interface IProps {
        beams: C.BeamCount;
        direction: number;
        line1: number;
        line2: number;
        stemWidth: number;
        stroke: string;
        tuplet: C.MusicXML.TimeModification;
        tupletsTemporary: boolean;
        variableBeams: Array<number>; // MXFIX: make sure a new copy is created every time
        variableX: Array<number>;
        width: number;
        x: number;
        y: number;
    }
}

export = Beam;
