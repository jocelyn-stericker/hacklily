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
Object.defineProperty(exports, "__esModule", { value: true });
var musicxml_interfaces_1 = require("musicxml-interfaces");
var lodash_1 = require("lodash");
var invariant = require("invariant");
var document_1 = require("./document");
var private_chordUtil_1 = require("./private_chordUtil");
/**
 * Lays out measures within a bar & justifies.
 *
 * @returns new end of line
 */
function tied(options, bounds, measures) {
    lodash_1.forEach(measures, function (measure) {
        // Note that the `number` property of beams does NOT differentiate between sets of beams,
        // as it does with e.g., ties. See `note.mod`.
        var activeTieds = {};
        // Invariant: measure.elements[i].length == measure.elements[j].length for all valid i, j.
        lodash_1.times(measure.elements[0].length, function (i) {
            lodash_1.forEach(measure.elements, function (elements) {
                var layout = elements[i];
                var model = layout.model;
                if (!model || layout.renderClass !== document_1.Type.Chord) {
                    return;
                }
                var chord = model;
                var noteWithTieds = lodash_1.find(chord, function (el) {
                    var notations = private_chordUtil_1.notationObj(el);
                    return notations && notations.tieds && notations.tieds.length;
                });
                if (noteWithTieds && noteWithTieds.grace) {
                    // TODO: grace notes
                    return;
                }
                if (!noteWithTieds) {
                    return;
                }
                var notations = private_chordUtil_1.notationObj(noteWithTieds);
                var tieds = notations.tieds;
                lodash_1.forEach(tieds, function (tied) {
                    invariant(isFinite(tied.number) && tied.number !== null, "Tieds must have an ID (tied.number)");
                    var currTied = activeTieds[tied.number];
                    if (currTied) {
                        if (tied.type === musicxml_interfaces_1.StartStopContinue.Start) {
                            console.warn("Found \"Start\" Tied that continues an existing Tied:", currTied);
                        }
                        currTied.elements.push(layout);
                        terminateTied$(activeTieds, tied);
                    }
                    if (tied.type !== musicxml_interfaces_1.StartStopContinue.Stop) {
                        activeTieds[tied.number] = {
                            number: tied.number,
                            elements: [layout],
                            initial: tied
                        };
                    }
                });
            });
        });
        lodash_1.forEach(activeTieds, function (tied, idx) {
            console.warn("Tied %s was not closed before the end of the measure " +
                "(this will be implemented later!)", idx);
        });
    });
    return measures;
}
function terminateTied$(activeTieds, tied) {
    activeTieds[tied.number].initial.satieTieTo = activeTieds[tied.number].elements[1];
    delete activeTieds[tied.number];
}
exports.default = tied;
//# sourceMappingURL=implChord_tiedsPostprocessor.js.map