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
import _ = require("lodash");
import invariant = require("react/lib/invariant");

import Engine = require("../engine");
import ChordImpl = require("../chord/chordImpl");

interface IMutableBeam {
    number: number;
    elements: Engine.IModel.ILayout[];
    counts: number[];
    attributes: MusicXML.Attributes;
    initial: MusicXML.Beam;
}

type BeamSet = {[voice: string]: IMutableBeam[]};

/** 
 * Lays out measures within a bar & justifies.
 * 
 * @returns new end of line
 */
function beam(options: Engine.Options.ILayoutOptions, bounds: Engine.Options.ILineBounds,
        measures: Engine.Measure.IMeasureLayout[]): Engine.Measure.IMeasureLayout[] {
    _.forEach(measures, measure => {
        // Note that the `number` property of beams does NOT differentiate between sets of beams,
        // as it does with e.g., ties. See `note.mod`.
        let activeBeams: BeamSet = {};
        let activeAttributes: MusicXML.Attributes = null;
        // Invariant: measure.elements[i].length == measure.elements[j].length for all valid i, j.
        _.times(measure.elements[0].length, i => {
            _.forEach(measure.elements, elements => {
                let layout = elements[i];
                let model = layout.model;
                if (model && layout.renderClass === Engine.IModel.Type.Attributes) {
                    activeAttributes = <any> model;
                }
                if (!model || layout.renderClass !== Engine.IModel.Type.Chord) {
                    return;
                }
                let chord: Engine.IChord = <any> model;
                let noteWithBeams = _.find(chord, el => !!el.beams);
                if (noteWithBeams && noteWithBeams.grace) {
                    // TODO: grace notes
                    return;
                }
                if (!noteWithBeams) {
                    _.forEach(chord, note => {
                        if (!note || note.grace) {
                            // TODO: grace notes
                            return;
                        }
                        _.forEach(activeBeams[note.voice], (beam, idx) => {
                            if (!beam) {
                                return;
                            }
                            console.warn("Beam in voice %s, level %s was not explicitly closed " +
                                "before another note was added.", note.voice, idx);
                            terminateBeam$(note.voice, idx, activeBeams);
                        });
                    });
                    return;
                }
                let beams = noteWithBeams.beams;
                let toTerminate: {
                    voice: number;
                    idx: number;
                    beamSet: BeamSet;
                }[] = [];

                let anyInvalid = _.any(_.sortBy(beams), (beam, idx) => {
                   let expected = idx + 1;
                   let actual = beam.number;
                   if (expected !== actual) {
                       console.warn("Invalid beam number"); // TODO: fix it
                       return true;
                   }
                   return false;
                });
                if (anyInvalid) {
                    return;
                }

                _.chain(beams).sortBy("number").forEach(beam => {
                    let idx = beam.number;
                    let voice = noteWithBeams.voice;
                    invariant(!!idx, "A beam's number must be defined in MusicXML.");
                    invariant(!!voice, "A beam's voice must be defined in MusicXML.");
                    activeBeams[voice] = activeBeams[voice] || [];
                    switch(beam.type) {
                        case MusicXML.BeamType.Begin:
                        case MusicXML.BeamType.ForwardHook:
                            activeBeams[voice] = activeBeams[voice] || [];
                            if (activeBeams[voice][idx]) {
                                console.warn(
                                    "Beam at level %s in voice %s should have " +
                                    "been closed before being opened again.", idx, voice);
                                terminateBeam$(voice, idx, activeBeams);
                            }
                            activeBeams[voice][idx] = {
                                number: idx,
                                elements: [layout],
                                initial: beam,
                                attributes: activeAttributes,
                                counts: [1]
                            };
                            let counts = activeBeams[voice][1].counts;
                            if (idx !== 1) {
                                counts[counts.length - 1]++;
                            }
                            break;
                        case MusicXML.BeamType.Continue:
                            invariant(voice in activeBeams,
                                "Cannot continue non-existant beam (no beam at all " +
                                "in current voice %s)", voice);
                            invariant(idx in activeBeams[voice], "Cannot continue non-existant " +
                                "beam (no beam at level %s in voice %s)", idx, voice);
                            activeBeams[voice][idx].elements.push(layout);

                            counts = activeBeams[voice][1].counts;
                            if (idx === 1) {
                                counts.push(1);
                            } else {
                                counts[counts.length - 1]++;
                            }
                            break;
                        case MusicXML.BeamType.BackwardHook:
                        case MusicXML.BeamType.End:
                            invariant(voice in activeBeams, "Cannot end non-existant beam " +
                                "(no beam at all in current voice %s)", voice);
                            invariant(idx in activeBeams[voice], "Cannot end non-existant " +
                                "beam (no beam at level %s in voice %s)", idx, voice);
                            activeBeams[voice][idx].elements.push(layout);

                            counts = activeBeams[voice][1].counts;

                            if (idx === 1) {
                                counts.push(1);
                            } else {
                                counts[counts.length - 1]++;
                            }
                            toTerminate.push({
                                voice: voice,
                                idx: idx,
                                beamSet: activeBeams
                            });
                            break;
                    }
                }).value();
                _.forEach(toTerminate, t => terminateBeam$(t.voice, t.idx, t.beamSet));
            });
        });
        _.forEach(activeBeams, (beams, voice) => {
            _.forEach(beams, (beam, idx) => {
                if (!beam) {
                    return;
                }
                console.warn(
                    "Beam in voice %s, level %s was not closed before the " +
                    "end of the measure.", voice, idx);
                terminateBeam$(parseInt(voice, 10), idx, activeBeams);
            });
        });
    });
    return measures;
}

function terminateBeam$(voice: number, idx: number, beamSet$: BeamSet) {
    if (idx === 1) {
        layoutBeam$(voice, idx, beamSet$);
    }

    delete beamSet$[voice][idx];
}

function layoutBeam$(voice: number, idx: number, beamSet$: BeamSet) {
    let beam = beamSet$[voice][idx];
    let chords: ChordImpl[] = _.map(beam.elements, eLayout => <any> eLayout.model);
    let firstChord = chords[0];
    let lastChord = chords[chords.length - 1];
    let clef = beam.attributes.clefs[firstChord.staffIdx];

    let firstAvgLine = Engine.IChord.averageLine(firstChord, clef);
    let lastAvgLine = Engine.IChord.averageLine(lastChord, clef);

    let avgLine = (firstAvgLine + lastAvgLine)/2;

    let direction = avgLine >= 3 ? -1 : 1; // TODO: MusicXML.StemType should match this!!

    let Xs: number[] = [];
    let lines: number[][] = [];

    _.forEach(beam.elements, (layout, idx) => {
        Xs.push(layout.x$);
        lines.push(Engine.IChord.linesForClef(chords[idx], clef));
    });

    let line1 = Engine.IChord.startingLine(firstChord, direction, clef);
    let line2 = Engine.IChord.startingLine(lastChord, direction, clef);

    var slope = (line2 - line1) / (Xs[Xs.length - 1] - Xs[0]) * 10;
    var stemHeight1 = 35;

    // Limit the slope to the range (-50, 50)
    if (slope > 0.5) {
        slope = 0.5;
    }
    if (slope < -0.5) {
        slope = -0.5;
    }

    var intercept = line1*10 + stemHeight1;

    function getStemHeight(direction: number, idx: number, line: number) {
        return intercept * direction +
            (direction === 1 ? 0 : 69) +
            slope * (Xs[idx] - Xs[0]) * direction -
            direction * line * 10;
    }

    // When the slope causes near-collisions, eliminate the slope.
    var minStemHeight = 1000;
    var incrementalIntercept = 0;
    _.each(chords, (chord, idx) => {
        let heightDeterminingLine = Engine.IChord.heightDeterminingLine(chord, -direction, clef);

        // Using -direction means that we'll be finding the closest note to the
        // beam. This will help us avoid collisions.
        var stemHeight = getStemHeight(direction, idx, heightDeterminingLine);
        if (stemHeight < minStemHeight) {
            minStemHeight = stemHeight;
            incrementalIntercept = direction*(30 - minStemHeight) + slope * (Xs[idx] - Xs[0]);
        }
    });

    if (minStemHeight < 30) {
        intercept += incrementalIntercept;
        slope = 0;
    }

    _.forEach(chords, (chord, idx) => {
        let stemStart = Engine.IChord.startingLine(chord, direction, clef);

        chord.satieStem = Object.create(firstChord.satieStem);
        chord.satieStem.direction = direction;
        chord.satieStem.stemStart = stemStart;
        chord.satieStem.stemHeight = getStemHeight(direction, idx, stemStart);

        chord.satieFlag = null;
    });

    firstChord.satieBeam = {
        beamCount: _.times(Xs.length, idx => beam.counts[idx]),
        direction: direction,
        x: Xs,
        y1: firstChord.satieStem.stemStart*10 + direction*firstChord.satieStem.stemHeight - 30,
        y2: lastChord.satieStem.stemStart*10 + direction*lastChord.satieStem.stemHeight - 30
    };
}

export = beam;
