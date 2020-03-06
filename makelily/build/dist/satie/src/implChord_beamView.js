/**
 * This file is part of Satie music engraver <https://github.com/jnetterf/satie>.
 * Copyright (C) Joshua Netterfield <joshua.ca> 2015 - present.
 *
 * Satie is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * Satie is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Satie.  If not, see <http://www.gnu.org/licenses/>.
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
import * as React from "react";
import { Component } from "react";
import * as PropTypes from "prop-types";
import { times, map } from "lodash";
import { bravura, getFontOffset } from "./private_smufl";
import TupletNumber from "./implChord_tupletNumberView";
/**
 * Renders a beam based on a computed layout.
 */
var Beam = /** @class */ (function (_super) {
    __extends(Beam, _super);
    function Beam() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Beam.prototype.render = function () {
        var _this = this;
        var xLow = this._getX1();
        var xHigh = this._getX2();
        var layout = this.props.layout;
        var tuplet = layout.tuplet, beamCount = layout.beamCount, x = layout.x, direction = layout.direction;
        return (React.createElement("g", null,
            map(beamCount, function (beams, idx) {
                return times(beams, function (beam) {
                    var x1;
                    var x2 = _this._withXOffset(x[idx]);
                    if (beamCount[idx - 1] <= beam) {
                        if (x[idx + 1] && beamCount[idx + 1] === beams) {
                            return null;
                        }
                        x1 = _this._withXOffset((x[idx - 1] + x[idx] * 3) / 4);
                        if (idx === 0) {
                            return null;
                        }
                    }
                    else if (beamCount[idx + 1] <= beam &&
                        (!x[idx + 1] || beamCount[idx - 1] !== beams)) {
                        x1 = _this._withXOffset(x[idx]);
                        x2 = _this._withXOffset((x[idx + 1] + x[idx] * 3) / 4);
                    }
                    else {
                        x1 = _this._withXOffset(x[idx - 1]);
                        if (idx === 0) {
                            return null;
                        }
                    }
                    return (React.createElement("polygon", { fill: _this.props.stroke, key: idx + "_" + beam, points: x1 +
                            "," +
                            _this._getYVar(0, beam, (x1 - xLow) / (xHigh - xLow)) +
                            " " +
                            x2 +
                            "," +
                            _this._getYVar(0, beam, (x2 - xLow) / (xHigh - xLow)) +
                            " " +
                            x2 +
                            "," +
                            _this._getYVar(1, beam, (x2 - xLow) / (xHigh - xLow)) +
                            " " +
                            x1 +
                            "," +
                            _this._getYVar(1, beam, (x1 - xLow) / (xHigh - xLow)), stroke: _this.props.stroke, strokeWidth: 0 }));
                });
            }),
            tuplet && (React.createElement(TupletNumber, { tuplet: tuplet, x1: xLow, x2: xHigh, y1: this._getYVar(0, -1, 0) - (direction >= 1 ? 8.5 : -1.8), y2: this._getYVar(0, -1, 1) - (direction >= 1 ? 8.5 : -1.8) }))));
    };
    /**
     * Offset because the note-head has a non-zero width.
     */
    Beam.prototype.getLineXOffset = function () {
        return (this.props.layout.direction * -this.props.stemWidth) / 2;
    };
    Beam.prototype._withXOffset = function (x) {
        // Note that we use notehadBlack regardless of the notehead.
        // This keeps spacing consistent, even in beam groups with rests.
        return (x +
            getFontOffset("noteheadBlack", this.props.layout.direction)[0] * 10 +
            this.getLineXOffset());
    };
    Beam.prototype._getX1 = function () {
        return this._withXOffset(this.props.layout.x[0]);
    };
    Beam.prototype._getX2 = function () {
        return this._withXOffset(this.props.layout.x[this.props.layout.x.length - 1]);
    };
    Beam.prototype._getY1 = function (incl, idx) {
        // Note that we use notehadBlack regardless of the notehead.
        // This keeps spacing consistent, even in beam groups with rests.
        return (this.context.originY -
            this.props.layout.y1 -
            this._getYOffset() +
            this.props.layout.direction * idx * 8.8 -
            // TODO: use print defaults
            (incl || 0) * (bravura.engravingDefaults.beamThickness * 10));
    };
    Beam.prototype._getY2 = function (incl, idx) {
        // Note that we use notehadBlack regardless of the notehead.
        // This keeps spacing consistent, even in beam groups with rests.
        return (this.context.originY -
            this.props.layout.y2 -
            this._getYOffset() +
            this.props.layout.direction * idx * 8.8 -
            (incl || 0) * (bravura.engravingDefaults.beamThickness * 10));
    };
    Beam.prototype._getYVar = function (incl, idx, percent) {
        var y1 = this._getY1(incl, idx);
        var y2 = this._getY2(incl, idx);
        return (1 - percent) * y1 + percent * y2;
    };
    /**
     * Offset because the note-head has a non-zero height.
     * The note-head is NOT CENTERED at its local origin.
     */
    Beam.prototype._getYOffset = function () {
        return -3;
    };
    Beam.contextTypes = {
        originY: PropTypes.number.isRequired,
    };
    return Beam;
}(Component));
export default Beam;
//# sourceMappingURL=implChord_beamView.js.map