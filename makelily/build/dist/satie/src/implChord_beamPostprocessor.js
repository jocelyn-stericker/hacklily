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
/**
 * @file Creates beams and tuplets
 */
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
function beam(options, bounds, measures) {
    lodash_1.forEach(measures, function (measure) {
        // Note that the `number` property of beams does NOT differentiate between sets of beams,
        // as it does with e.g., ties. See `note.mod`.
        var activeBeams = {};
        var activeUnbeamedTuplets = {};
        var activeAttributes = null;
        // Invariant: measure.elements[i].length == measure.elements[j].length for all valid i, j.
        lodash_1.times(measure.elements[0].length, function (i) {
            lodash_1.forEach(measure.elements, function (elements) {
                var layout = elements[i];
                var model = layout.model;
                if (model && layout.renderClass === document_1.Type.Attributes) {
                    activeAttributes = model;
                }
                if (!model || layout.renderClass !== document_1.Type.Chord) {
                    return;
                }
                var chord = model;
                var targetNote = lodash_1.find(chord, function (note) { return !!note.beams; });
                var startTuplet;
                var stopTuplet;
                lodash_1.forEach(chord, function (note) {
                    lodash_1.forEach(note.notations, function (notation) {
                        lodash_1.forEach(notation.tuplets, function (aTuplet) {
                            targetNote = targetNote || note;
                            if (aTuplet.type === musicxml_interfaces_1.StartStop.Start) {
                                startTuplet = aTuplet;
                            }
                            else {
                                stopTuplet = aTuplet;
                            }
                        });
                    });
                });
                if (targetNote && targetNote.grace) {
                    // TODO: grace notes
                    return;
                }
                if (!targetNote) {
                    lodash_1.forEach(chord, function (note) {
                        if (!note || note.grace) {
                            // TODO: grace notes
                            return;
                        }
                        lodash_1.forEach(activeBeams[note.voice], function (beam, idx) {
                            if (!beam) {
                                return;
                            }
                            console.warn("Beam in voice %s, level %s was not explicitly closed " +
                                "before another note was added.", note.voice, idx);
                        });
                    });
                    return;
                }
                var beams = targetNote.beams, voice = targetNote.voice;
                if (!beams) {
                    beams = [];
                }
                var toTerminate = [];
                var anyInvalid = lodash_1.some(lodash_1.sortBy(beams), function (beam, idx) {
                    var expected = idx + 1;
                    var actual = beam.number;
                    if (expected !== actual) {
                        console.warn("Invalid beam number"); // TODO: fix it
                        return true;
                    }
                    return false;
                });
                if (anyInvalid) {
                    return;
                }
                if (!beams.length && startTuplet) {
                    activeUnbeamedTuplets[voice] = activeUnbeamedTuplets[voice] || [];
                    activeUnbeamedTuplets[voice][startTuplet.number || 1] = {
                        number: startTuplet.number || 1,
                        elements: [layout],
                        initial: null,
                        attributes: activeAttributes._snapshot,
                        counts: [1],
                        tuplet: startTuplet
                    };
                }
                else {
                    lodash_1.forEach(activeUnbeamedTuplets[voice], function (unbeamedTuplet) {
                        if (unbeamedTuplet) {
                            unbeamedTuplet.elements.push(layout);
                        }
                    });
                }
                if (stopTuplet && activeUnbeamedTuplets[voice] &&
                    activeUnbeamedTuplets[voice][stopTuplet.number || 1]) {
                    toTerminate.push({
                        voice: voice,
                        isUnbeamedTuplet: true,
                        idx: stopTuplet.number || 1,
                        beamSet: activeUnbeamedTuplets
                    });
                }
                lodash_1.chain(beams).sortBy("number").forEach(function (beam) {
                    var idx = beam.number;
                    invariant(!!idx, "A beam's number must be defined in MusicXML.");
                    invariant(!!voice, "A beam's voice must be defined in MusicXML.");
                    activeBeams[voice] = activeBeams[voice] || [];
                    switch (beam.type) {
                        case musicxml_interfaces_1.BeamType.Begin:
                        case musicxml_interfaces_1.BeamType.BackwardHook:
                        case musicxml_interfaces_1.BeamType.ForwardHook:
                            activeBeams[voice] = activeBeams[voice] || [];
                            if (activeBeams[voice][idx]) {
                                console.warn("Beam at level %s in voice %s should have " +
                                    "been closed before being opened again.", idx, voice);
                                terminateBeam(voice, idx, activeBeams, false);
                            }
                            activeBeams[voice][idx] = {
                                number: idx,
                                elements: [layout],
                                initial: beam,
                                attributes: activeAttributes._snapshot,
                                counts: [1],
                                tuplet: startTuplet
                            };
                            var counts = activeBeams[voice][1].counts;
                            if (idx !== 1) {
                                counts[counts.length - 1]++;
                            }
                            if (beam.type === musicxml_interfaces_1.BeamType.Begin) {
                                break;
                            }
                        // Passthrough for BackwardHook and ForwardHook, which are single note things
                        case musicxml_interfaces_1.BeamType.End:
                            invariant(voice in activeBeams, "Cannot end non-existant beam " +
                                "(no beam at all in current voice %s)", voice);
                            invariant(idx in activeBeams[voice], "Cannot end non-existant " +
                                "beam (no beam at level %s in voice %s)", idx, voice);
                            activeBeams[voice][idx].elements.push(layout);
                            counts = activeBeams[voice][1].counts;
                            if (beam.type === musicxml_interfaces_1.BeamType.End) {
                                if (idx === 1) {
                                    counts.push(1);
                                }
                                else {
                                    counts[counts.length - 1]++;
                                }
                            }
                            toTerminate.push({
                                voice: voice,
                                idx: idx,
                                isUnbeamedTuplet: false,
                                beamSet: activeBeams
                            });
                            var groupTuplet = activeBeams[voice][idx].tuplet;
                            if (groupTuplet && !stopTuplet) {
                                // We optimisticly attached the tuplet to the beam, but it extends
                                // beyond the beam. Detach the tuplet from the beam, and create an
                                // unbeamed tuplet.
                                activeBeams[voice][idx].tuplet = null;
                                activeUnbeamedTuplets[voice] = activeUnbeamedTuplets[voice] || [];
                                activeUnbeamedTuplets[voice][groupTuplet.number || 1] = {
                                    number: groupTuplet.number || 1,
                                    elements: activeBeams[voice][idx].elements.slice(),
                                    initial: null,
                                    attributes: activeBeams[voice][idx].attributes,
                                    counts: activeBeams[voice][idx].counts.slice(),
                                    tuplet: groupTuplet
                                };
                            }
                            break;
                        case musicxml_interfaces_1.BeamType.Continue:
                            invariant(voice in activeBeams, "Cannot continue non-existant beam (no beam at all " +
                                "in current voice %s)", voice);
                            invariant(idx in activeBeams[voice], "Cannot continue non-existant " +
                                "beam (no beam at level %s in voice %s)", idx, voice);
                            activeBeams[voice][idx].elements.push(layout);
                            counts = activeBeams[voice][1].counts;
                            if (idx === 1) {
                                counts.push(1);
                            }
                            else {
                                counts[counts.length - 1]++;
                            }
                            break;
                        default:
                            throw new Error("Unknown type " + beam.type);
                    }
                }).value();
                lodash_1.forEach(toTerminate, function (t) {
                    return terminateBeam(t.voice, t.idx, t.beamSet, t.isUnbeamedTuplet);
                });
            });
        });
        lodash_1.forEach(activeBeams, function (beams, voice) {
            lodash_1.forEach(beams, function (beam, idx) {
                if (!beam) {
                    return;
                }
                console.warn("Beam in voice %s, level %s was not closed before the " +
                    "end of the measure.", voice, idx);
                terminateBeam(parseInt(voice, 10), idx, activeBeams, false);
            });
        });
    });
    return measures;
}
function terminateBeam(voice, idx, beamSet, isUnbeamedTuplet) {
    if (isUnbeamedTuplet || idx === 1) {
        layoutBeam(voice, idx, beamSet, isUnbeamedTuplet);
    }
    delete beamSet[voice][idx];
}
function layoutBeam(voice, idx, beamSet, isUnbeamedTuplet) {
    var beam = beamSet[voice][idx];
    var chords = lodash_1.map(beam.elements, function (eLayout) { return eLayout.model; });
    var firstChord = lodash_1.first(chords);
    var lastChord = lodash_1.last(chords);
    var clef = beam.attributes.clef;
    var firstAvgLine = private_chordUtil_1.averageLine(firstChord, clef);
    var lastAvgLine = private_chordUtil_1.averageLine(lastChord, clef);
    var avgLine = (firstAvgLine + lastAvgLine) / 2;
    var direction = avgLine >= 3 ? -1 : 1; // TODO: StemType should match this!!
    var Xs = [];
    var lines = [];
    lodash_1.forEach(beam.elements, function (layout, idx) {
        Xs.push(layout.x);
        lines.push(private_chordUtil_1.linesForClef(chords[idx], clef));
    });
    var line1 = private_chordUtil_1.startingLine(firstChord, direction, clef);
    var line2 = private_chordUtil_1.startingLine(lastChord, direction, clef);
    var slope = (line2 - line1) / (lodash_1.last(Xs) - lodash_1.first(Xs)) * 10;
    var stemHeight1 = 35;
    // Limit the slope to the range (-50, 50)
    if (slope > 0.5) {
        slope = 0.5;
    }
    if (slope < -0.5) {
        slope = -0.5;
    }
    var intercept = line1 * 10 + stemHeight1;
    function getStemHeight(direction, idx, line) {
        return intercept * direction +
            (direction === 1 ? 0 : 69) +
            slope * (Xs[idx] - lodash_1.first(Xs)) * direction -
            direction * line * 10;
    }
    // When the slope causes near-collisions, eliminate the slope.
    var minStemHeight = 1000;
    var incrementalIntercept = 0;
    lodash_1.forEach(chords, function (chord, idx) {
        var currHeightDeterminingLine = private_chordUtil_1.heightDeterminingLine(chord, direction, clef);
        var stemHeight = getStemHeight(direction, idx, currHeightDeterminingLine);
        if (stemHeight < minStemHeight) {
            minStemHeight = stemHeight;
            incrementalIntercept = direction * (30 - minStemHeight) + slope * (Xs[idx] - lodash_1.first(Xs));
        }
    });
    if (minStemHeight < 30) {
        intercept += incrementalIntercept;
        slope = 0;
    }
    if (slope === 0 && intercept >= 0 && intercept <= 50) {
        intercept += direction * (10 - (intercept % 10));
    }
    var layouts = beam.elements;
    if (isUnbeamedTuplet) {
        var offsetY = direction > 0 ? -13 : -53;
        lodash_1.forEach(layouts, function (chordLayout, idx) {
            var stemStart = private_chordUtil_1.startingLine(chordLayout.model, direction, clef);
            var stemHeight = getStemHeight(direction, idx, stemStart);
            invariant(chords.length === 1 || isFinite(stemHeight), "stemHeight must be defined for 2+ notes");
            chordLayout.satieStem = {
                direction: direction,
                stemStart: stemStart,
                stemHeight: stemHeight,
                tremolo: lodash_1.first(layouts).satieStem ? lodash_1.first(layouts).satieStem.tremolo : null,
            };
        });
        var tuplet = Object.create(beam.tuplet);
        tuplet.placement = direction > 0 ? musicxml_interfaces_1.AboveBelow.Above : musicxml_interfaces_1.AboveBelow.Below;
        var firstStem = lodash_1.first(layouts).satieStem;
        var lastStem = lodash_1.last(layouts).satieStem;
        firstChord.satieUnbeamedTuplet = {
            beamCount: null,
            direction: direction,
            x: Xs,
            y1: firstStem.stemStart * 10 + direction * firstStem.stemHeight + offsetY,
            y2: lastStem.stemStart * 10 + direction * lastStem.stemHeight + offsetY,
            tuplet: tuplet
        };
    }
    else {
        lodash_1.forEach(layouts, function (chordLayout, idx) {
            var stemStart = private_chordUtil_1.startingLine(chordLayout.model, direction, clef);
            var stemHeight = getStemHeight(direction, idx, stemStart);
            chordLayout.satieStem = {
                direction: direction,
                stemStart: stemStart,
                stemHeight: stemHeight,
                tremolo: layouts[0].satieStem ? layouts[0].satieStem.tremolo : null,
            };
            chordLayout.satieFlag = null;
        });
        var firstStem = lodash_1.first(layouts).satieStem;
        var lastStem = lodash_1.last(layouts).satieStem;
        var firstLayout = lodash_1.first(beam.elements);
        firstLayout.satieBeam = {
            beamCount: lodash_1.times(Xs.length, function (idx) { return beam.counts[idx]; }),
            direction: direction,
            x: Xs,
            y1: firstStem.stemStart * 10 + direction * firstStem.stemHeight - 30,
            y2: lastStem.stemStart * 10 + direction * lastStem.stemHeight - 30,
            tuplet: beam.tuplet
        };
    }
}
exports.default = beam;
//# sourceMappingURL=implChord_beamPostprocessor.js.map