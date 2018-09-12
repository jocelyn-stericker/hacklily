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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var lodash_1 = require("lodash");
var invariant_1 = __importDefault(require("invariant"));
exports.NUMBER_SPACING = 28;
exports.PLUS_SPACING = 12;
// Gould(6): "A clef is indented into the stave by one stave-space or a little less"
exports.CLEF_INDENTATION = 7;
exports.FLAT_WIDTH = 10;
exports.DOUBLE_FLAT_WIDTH = 19;
exports.DOUBLE_SHARP_WIDTH = 13;
exports.SHARP_WIDTH = 11;
exports.NATURAL_WIDTH = 11;
/**
 * Returns true if warning Attributes are required at the end of a line, and false otherwise.
 */
function needsWarning(end, start, staff) {
    invariant_1.default(!!end && !!start, "A null end or start was passed to needsWarning. Check your types!!");
    invariant_1.default(!("P1" in end || "P1" in start), "An object with 'P1' was passed to needsWarning. Check your types!!");
    return !clefsEqual(end, start, staff) || !timesEqual(end, start) || !keysEqual(end, start);
}
exports.needsWarning = needsWarning;
function clefWidth(attributes) {
    return 24;
}
exports.clefWidth = clefWidth;
function timeWidth(attributes) {
    if (!attributes.times[0] || !attributes.times[0].beatTypes) {
        return 0;
    }
    var beats = attributes.times[0].beats;
    var numeratorSegments = lodash_1.reduce(beats, function (memo, beats) { return memo + beats.split("+").length; }, 0);
    return exports.NUMBER_SPACING * numeratorSegments +
        (attributes.times[0].beatTypes.length - 1) * exports.PLUS_SPACING;
}
exports.timeWidth = timeWidth;
function keyWidth(attributes) {
    if (!attributes.keySignatures[0]) {
        return 0;
    }
    var keySignature = attributes.keySignatures[0];
    if (keySignature.fifths || keySignature.keyAlters) {
        return 2 + lodash_1.reduce(keyWidths(keySignature), function (memo, width) { return memo + width; }, 0);
    }
    else {
        return -5;
    }
}
exports.keyWidth = keyWidth;
function clefsEqual(from, to, staff) {
    var cA = from && from.clefs[staff];
    var cB = to && to.clefs[staff];
    if (!cA || !cB) {
        return false;
    }
    return cA.sign === cB.sign &&
        cA.line === cB.line &&
        cA.clefOctaveChange === cB.clefOctaveChange;
}
exports.clefsEqual = clefsEqual;
function timesEqual(from, to) {
    var tA = from && from.times[0];
    var tB = to && to.times[0];
    if (!tA || !tB) {
        return false;
    }
    return JSON.stringify(tA.beats) === JSON.stringify(tB.beats) &&
        JSON.stringify(tA.beatTypes) === JSON.stringify(tB.beatTypes) &&
        !!tA.senzaMisura === !!tB.senzaMisura &&
        tA.symbol === tB.symbol;
}
exports.timesEqual = timesEqual;
function keysEqual(from, to) {
    var keyA = from && from.keySignatures[0];
    var keyB = to && to.keySignatures[0];
    if (!keyA || !keyB) {
        return false;
    }
    return keyA.fifths === keyB.fifths &&
        JSON.stringify(keyA.keySteps) === JSON.stringify(keyB.keySteps) &&
        JSON.stringify(keyA.keyAccidentals) === JSON.stringify(keyB.keyAccidentals) &&
        JSON.stringify(keyA.keyAlters) === JSON.stringify(keyB.keyAlters) &&
        keyA.mode === keyB.mode;
}
exports.keysEqual = keysEqual;
function approximateWidth(attributes, atEnd) {
    if (atEnd === void 0) { atEnd = 0 /* No */; }
    if (atEnd) {
        return 80;
    }
    return 150;
}
exports.approximateWidth = approximateWidth;
function keyWidths(spec) {
    var widths = [];
    if (spec.keyAlters) {
        return lodash_1.map(spec.keyAlters, function (alter) {
            switch (alter) {
                case "-2":
                case "-1.5":
                    return exports.DOUBLE_FLAT_WIDTH;
                case "-1":
                case "-0.5":
                    return exports.FLAT_WIDTH;
                case "0":
                    return exports.NATURAL_WIDTH;
                case "0.5":
                case "1":
                    return exports.SHARP_WIDTH;
                case "1.5":
                case "2":
                    return exports.DOUBLE_SHARP_WIDTH;
                default:
                    console.warn("Unknown accidental ", alter);
                    return exports.SHARP_WIDTH;
            }
        });
    }
    var accidentalCount = Math.min(7, Math.abs(spec.fifths));
    var idxes = lodash_1.times(accidentalCount, function (i) { return (i + Math.max(0, Math.abs(spec.fifths) - 7)) % 7; });
    lodash_1.forEach(idxes, function (i) { return widths[i] = getWidth(i, spec.fifths >= 0); });
    return widths;
    function getWidth(i, sharp) {
        switch (true) {
            case (sharp && 7 + i < spec.fifths):
                return exports.DOUBLE_SHARP_WIDTH;
            case (sharp && 7 + i >= spec.fifths):
                return exports.SHARP_WIDTH;
            case (!sharp && (7 + i < -spec.fifths)):
                return exports.DOUBLE_FLAT_WIDTH;
            case (!sharp && (7 + i >= -spec.fifths)):
                return exports.FLAT_WIDTH;
            default:
                throw new Error("Impossible.");
        }
    }
}
exports.keyWidths = keyWidths;
function getNativeKeyAccidentals(spec) {
    var accidentals = {};
    var sharps = "FCGDAEB";
    var flats = "BEADGCF";
    if (spec.fifths) {
        var accCount = Math.min(7, Math.abs(spec.fifths));
        var sharp_1 = spec.fifths >= 0;
        (sharp_1 ? sharps : flats).slice(0, accCount).split("").forEach(function (note) {
            accidentals[note] = sharp_1 ? 1 : -1;
        });
    }
    else if (spec.keySteps) {
        for (var i = 0; i < spec.keySteps.length; ++i) {
            accidentals[spec.keySteps[i]] = parseInt(spec.keyAlters[i], 10);
        }
    }
    return accidentals;
}
exports.getNativeKeyAccidentals = getNativeKeyAccidentals;
//# sourceMappingURL=implAttributes_attributesData.js.map