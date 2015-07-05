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

import {createFactory as $, Component, DOM, PropTypes} from "react";
import {times, map} from "lodash";

import IBeam from "../engine/ibeam";
import TupletNumber from "./tupletNumber";
import {bravura, getFontOffset} from "../models/smufl";

/**
 * Renders a beam based on a computed layout.
 */
class Beam extends Component<Beam.IProps, void> {
    render(): any {
        let xLow = this._getX1();
        let xHigh = this._getX2();
        let {layout} = this.props;
        let {tuplet, beamCount, x, direction} = layout;

        return DOM.g(null,
            map(beamCount, (beams: number, idx: number): any => {
                if (idx === 0) {
                    return null;
                }
                return times(beams, beam => {
                    let x1: number;
                    let x2: number = this._withXOffset(x[idx]);
                    if (beamCount[idx - 1] <= beam) {
                        if (x[idx + 1] &&
                            beamCount[idx + 1] === beams) {
                            return null;
                        }
                        x1 = this._withXOffset((x[idx - 1] + x[idx] * 3) / 4);
                    } else {
                        x1 = this._withXOffset(x[idx - 1]);
                    }
                    return DOM.polygon({
                        fill: this.props.stroke,
                        key: idx + "_" + beam,
                        points: x1 + "," +
                            this._getYVar(0, beam, (x1 - xLow)/(xHigh - xLow)) + " " +
                            x2 + "," +
                            this._getYVar(0, beam, (x2 - xLow)/(xHigh - xLow)) + " " +
                            x2 + "," +
                            this._getYVar(1, beam, (x2 - xLow)/(xHigh - xLow)) + " " +
                            x1 + "," +
                            this._getYVar(1, beam, (x1 - xLow)/(xHigh - xLow)),
                        stroke: this.props.stroke,
                        strokeWidth: 0
                    });
                });
            }),
            tuplet && $(TupletNumber)({
                tuplet,
                x1: xLow,
                x2: xHigh,
                y1: this._getYVar(0, -1, 0) - (direction >= 1 ? 8.5 : -1.8),
                y2: this._getYVar(0, -1, 1) - (direction >= 1 ? 8.5 : -1.8)
            })
        /* DOM.g */);
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
            getFontOffset("noteheadBlack", this.props.layout.direction)[0]*10 +
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
            (incl || 0)*(bravura.engravingDefaults.beamThickness*10);
    }

    private _getY2(incl: number, idx: number) {
        // Note that we use notehadBlack regardless of the notehead.
        // This keeps spacing consistent, even in beam groups with rests.
        return this.context.originY -
            this.props.layout.y2 -
            this._getYOffset() +
            this.props.layout.direction*idx*8.8 -
            (incl || 0)*(bravura.engravingDefaults.beamThickness*10);
    }

    private _getYVar(incl: number, idx: number, percent: number) {
        let y1 = this._getY1(incl, idx);
        let y2 = this._getY2(incl, idx);
        return (1 - percent) * y1 + percent * y2;
    }

    /**
     * Offset because the note-head has a non-zero height.
     * The note-head is NOT CENTERED at its local origin.
     */
    private _getYOffset() {
        return -3;
    }
};

module Beam {
    export let contextTypes = <any> {
        originX: PropTypes.number.isRequired,
        originY: PropTypes.number.isRequired
    };

    export interface IProps {
        layout: IBeam.ILayout;
        stemWidth: number;
        stroke: string;
    }
}

export default Beam;
