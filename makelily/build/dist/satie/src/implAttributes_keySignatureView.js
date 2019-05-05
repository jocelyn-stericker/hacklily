"use strict";
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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var React = __importStar(require("react"));
var musicxml_interfaces_1 = require("musicxml-interfaces");
var react_1 = require("react");
var lodash_1 = require("lodash");
var implAttributes_accidentalView_1 = __importDefault(require("./implAttributes_accidentalView"));
var implAttributes_attributesData_1 = require("./implAttributes_attributesData");
var private_chordUtil_1 = require("./private_chordUtil");
// TODO: this almost looks like logic -- move.
var sharps = {
    // "FCGDAEB"
    alto: [4.5, 3, 5, 3.5, 2, 4, 2.5],
    bass: [4, 2.5, 4.5, 3, 1.5, 3.5, 2],
    tenor: [2, 4, 2.5, 4.5, 3, 5, 3.5],
    treble: [5, 3.5, 5.5, 4, 2.5, 4.5, 3],
};
var flats = {
    // "BEADGCF"
    alto: [2.5, 4, 2, 3.5, 1.5, 3, 1],
    bass: [2, 3.5, 1.5, 3, 1, 2.5, 0.5],
    tenor: [3.5, 5, 3, 4.5, 2.5, 4, 2],
    treble: [3, 4.5, 2.5, 4, 2, 3.5, 1.5],
};
/**
 * Renders a key signature.
 */
var KeyView = /** @class */ (function (_super) {
    __extends(KeyView, _super);
    function KeyView() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    KeyView.prototype.render = function () {
        return (React.createElement("g", null, lodash_1.map(this.getAccidentals(), function (accidental, idx) { return (React.createElement(implAttributes_accidentalView_1.default, { key: idx, spec: accidental })); })));
    };
    /**
     * Returns an array representing the position and glyphName of each accidental.
     */
    KeyView.prototype.getAccidentals = function () {
        var _this = this;
        // TODO: this is expensive -- compute in attributes!
        var spec = this.props.spec;
        var clef = this.props.clef;
        var widths = implAttributes_attributesData_1.keyWidths(spec);
        var positions = [];
        var x = 0;
        if (spec.fifths) {
            var accCount = Math.min(7, Math.abs(spec.fifths));
            var idxes_1 = lodash_1.times(accCount, function (i) { return (i + Math.max(0, Math.abs(spec.fifths) - 7)) % 7; });
            for (var i = 0; i < idxes_1.length; ++i) {
                positions.push(x);
                x += widths[idxes_1[i]];
            }
            return lodash_1.map(idxes_1, function (i) {
                return makeAccidentalFromSharps(idxes_1, i, spec.fifths >= 0);
            });
        }
        for (var i = 0; i < widths.length; ++i) {
            positions.push(x);
            x += widths[i];
        }
        if (spec.keySteps) {
            return lodash_1.map(spec.keySteps, function (keyStep, idx) {
                var keyAlters = spec.keyAlters[idx];
                var hasOctave = spec.keyOctaves && spec.keyOctaves[idx];
                var octave = hasOctave ? spec.keyOctaves[idx].octave : null;
                if (octave === null) {
                    while (private_chordUtil_1.lineForClef_(keyStep, octave, _this.props.clef) < 2) {
                        ++octave;
                    }
                }
                var line = private_chordUtil_1.lineForClef_(keyStep, octave, _this.props.clef);
                var accidental = null;
                switch (keyAlters) {
                    case "-2":
                        accidental = musicxml_interfaces_1.MxmlAccidental.DoubleFlat;
                        break;
                    case "-1.5":
                        accidental = musicxml_interfaces_1.MxmlAccidental.ThreeQuartersFlat;
                        break;
                    case "-1":
                        accidental = musicxml_interfaces_1.MxmlAccidental.Flat;
                        break;
                    case "-0.5":
                        accidental = musicxml_interfaces_1.MxmlAccidental.QuarterFlat;
                        break;
                    case "0":
                        accidental = musicxml_interfaces_1.MxmlAccidental.Natural;
                        break;
                    case "0.5":
                        accidental = musicxml_interfaces_1.MxmlAccidental.QuarterSharp;
                        break;
                    case "1":
                        accidental = musicxml_interfaces_1.MxmlAccidental.Sharp;
                        break;
                    case "1.5":
                        accidental = musicxml_interfaces_1.MxmlAccidental.ThreeQuartersSharp;
                        break;
                    case "2":
                        accidental = musicxml_interfaces_1.MxmlAccidental.DoubleSharp;
                        break;
                    default:
                        console.warn("Unknown accidental ", keyAlters);
                        accidental = musicxml_interfaces_1.MxmlAccidental.Natural;
                }
                return {
                    accidental: accidental,
                    color: spec.color,
                    defaultX: spec.defaultX + positions[idx],
                    defaultY: spec.defaultY + (line - 3) * 10,
                    relativeX: spec.relativeX,
                    relativeY: spec.relativeY || 0,
                };
            });
        }
        return [];
        function makeAccidentalFromSharps(idxes, i, sharp) {
            var accidental;
            switch (true) {
                case sharp && 7 + idxes[i] < spec.fifths:
                    accidental = musicxml_interfaces_1.MxmlAccidental.DoubleSharp;
                    break;
                case sharp && 7 + idxes[i] >= spec.fifths:
                    accidental = musicxml_interfaces_1.MxmlAccidental.Sharp;
                    break;
                case !sharp && 7 + idxes[i] < -spec.fifths:
                    accidental = musicxml_interfaces_1.MxmlAccidental.DoubleFlat;
                    break;
                case !sharp && 7 + idxes[i] >= -spec.fifths:
                    accidental = musicxml_interfaces_1.MxmlAccidental.Flat;
                    break;
                default:
                    throw new Error("Impossible!");
            }
            var line = (sharp ? sharps : flats)[standardClef(clef)][idxes[i]];
            return {
                accidental: accidental,
                color: spec.color,
                defaultX: spec.defaultX + positions[i],
                defaultY: spec.defaultY + (line - 3) * 10,
                relativeX: spec.relativeX,
                relativeY: spec.relativeY || 0,
            };
        }
    };
    return KeyView;
}(react_1.Component));
function standardClef(clef) {
    switch (true) {
        case clef.sign === "G":
            return "treble";
        case clef.sign === "F":
            return "bass";
        case clef.sign === "C" && clef.line === 3:
            return "alto";
        case clef.sign === "C" && clef.line === 4:
            return "tenor";
        default:
            console.warn("Invalid clef?");
            return "treble";
    }
}
exports.default = KeyView;
//# sourceMappingURL=implAttributes_keySignatureView.js.map