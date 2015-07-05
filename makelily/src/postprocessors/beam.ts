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

/**
 * @file Creates beams and tuplets
 */

"use strict";

import {Attributes, Beam, BeamType, StartStop, Tuplet, AboveBelow} from "musicxml-interfaces";
import {any, chain, forEach, find, map, sortBy, times, first, last} from "lodash";
import invariant = require("react/lib/invariant");

import ChordImpl from "../models/chord/chordImpl";
import {IAttributes, IChord, IModel, IMeasureLayout, ILayoutOptions, ILineBounds} from "../engine";

interface IMutableBeam {
    number: number;
    elements: IModel.ILayout[];
    counts: number[];
    attributes: IAttributes.ISnapshot;
    initial: Beam;
    tuplet: Tuplet;
}

type BeamSet = {[voice: string]: IMutableBeam[]};

/** 
 * Lays out measures within a bar & justifies.
 * 
 * @returns new end of line
 */
function beam(options: ILayoutOptions, bounds: ILineBounds,
        measures: IMeasureLayout[]): IMeasureLayout[] {
    forEach(measures, measure => {
        // Note that the `number` property of beams does NOT differentiate between sets of beams,
        // as it does with e.g., ties. See `note.mod`.
        let activeBeams: BeamSet = {};
        let activeUnbeamedTuplets: BeamSet = {};
        let activeAttributes: Attributes = null;
        // Invariant: measure.elements[i].length == measure.elements[j].length for all valid i, j.
        times(measure.elements[0].length, i => {
            forEach(measure.elements, elements => {
                let layout = elements[i];
                let model = layout.model;
                if (model && layout.renderClass === IModel.Type.Attributes) {
                    activeAttributes = <any> model;
                }
                if (!model || layout.renderClass !== IModel.Type.Chord) {
                    return;
                }
                let chord: IChord = <any> model;
                let targetNote = find(chord, note => !!note.beams);
                let tuplet: Tuplet;
                forEach(chord, note => {
                    return forEach(note.notations, notation => {
                       return forEach(notation.tuplets, aTuplet => {
                           targetNote = targetNote || note;
                           tuplet = aTuplet;
                           return !tuplet;
                       });
                    });
                });
                if (targetNote && targetNote.grace) {
                    // TODO: grace notes
                    return;
                }
                if (!targetNote) {
                    forEach(chord, note => {
                        if (!note || note.grace) {
                            // TODO: grace notes
                            return;
                        }
                        forEach(activeBeams[note.voice], (beam, idx) => {
                            if (!beam) {
                                return;
                            }
                            console.warn("Beam in voice %s, level %s was not explicitly closed " +
                                "before another note was added.", note.voice, idx);
                            terminateBeam$(note.voice, idx, activeBeams, false);
                        });
                    });
                    return;
                }
                let {beams, voice} = targetNote;
                if (!beams) {
                    beams = [];
                }
                let toTerminate: {
                    voice: number;
                    idx: number;
                    isUnbeamedTuplet: boolean;
                    beamSet: BeamSet;
                }[] = [];

                let anyInvalid = any(sortBy(beams), (beam, idx) => {
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

                if (!beams.length && tuplet.type === StartStop.Start) {
                    activeUnbeamedTuplets[voice] = activeUnbeamedTuplets[voice] || [];
                    activeUnbeamedTuplets[voice][tuplet.number || 1] = {
                        number: tuplet.number || 1,
                        elements: [layout],
                        initial: null,
                        attributes: (<any>activeAttributes)._snapshot,
                        counts: [1],
                        tuplet: tuplet
                    };
                } else {
                    forEach(activeUnbeamedTuplets[voice], unbeamedTuplet => {
                        if (unbeamedTuplet) {
                            unbeamedTuplet.elements.push(layout);
                        }
                    });
                }

                if (tuplet && tuplet.type === StartStop.Stop &&
                        activeUnbeamedTuplets[voice] &&
                        activeUnbeamedTuplets[voice][tuplet.number || 1]) {
                    toTerminate.push({
                        voice: voice,
                        isUnbeamedTuplet: true,
                        idx: tuplet.number || 1,
                        beamSet: activeUnbeamedTuplets
                    });
                }

                chain(beams).sortBy("number").forEach(beam => {
                    let idx = beam.number;
                    invariant(!!idx, "A beam's number must be defined in MusicXML.");
                    invariant(!!voice, "A beam's voice must be defined in MusicXML.");
                    activeBeams[voice] = activeBeams[voice] || [];
                    switch(beam.type) {
                        case BeamType.Begin:
                        case BeamType.ForwardHook:
                            activeBeams[voice] = activeBeams[voice] || [];
                            if (activeBeams[voice][idx]) {
                                console.warn(
                                    "Beam at level %s in voice %s should have " +
                                    "been closed before being opened again.", idx, voice);
                                terminateBeam$(voice, idx, activeBeams, false);
                            }
                            activeBeams[voice][idx] = {
                                number: idx,
                                elements: [layout],
                                initial: beam,
                                attributes: (<any>activeAttributes)._snapshot,
                                counts: [1],
                                tuplet: tuplet
                            };
                            let counts = activeBeams[voice][1].counts;
                            if (idx !== 1) {
                                counts[counts.length - 1]++;
                            }
                            break;
                        case BeamType.Continue:
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
                        case BeamType.BackwardHook:
                        case BeamType.End:
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
                                isUnbeamedTuplet: false,
                                beamSet: activeBeams
                            });

                            let groupTuplet = activeBeams[voice][idx].tuplet;
                            if (groupTuplet && (!tuplet || tuplet.type !== StartStop.Stop)) {
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
                    }
                }).value();
                forEach(toTerminate, t =>
                    terminateBeam$(t.voice, t.idx, t.beamSet, t.isUnbeamedTuplet));
            });
        });
        forEach(activeBeams, (beams, voice) => {
            forEach(beams, (beam, idx) => {
                if (!beam) {
                    return;
                }
                console.warn(
                    "Beam in voice %s, level %s was not closed before the " +
                    "end of the measure.", voice, idx);
                terminateBeam$(parseInt(voice, 10), idx, activeBeams, false);
            });
        });
    });
    return measures;
}

function terminateBeam$(voice: number, idx: number, beamSet$: BeamSet, isUnbeamedTuplet: boolean) {
    if (isUnbeamedTuplet || idx === 1) {
        layoutBeam$(voice, idx, beamSet$, isUnbeamedTuplet);
    }

    delete beamSet$[voice][idx];
}

function layoutBeam$(voice: number, idx: number, beamSet$: BeamSet, isUnbeamedTuplet: boolean) {
    let beam = beamSet$[voice][idx];
    let chords: ChordImpl[] = map(beam.elements, eLayout => <any> eLayout.model);
    let firstChord = first(chords);
    let lastChord = last(chords);
    let {clef} = beam.attributes;

    let firstAvgLine = IChord.averageLine(firstChord, clef);
    let lastAvgLine = IChord.averageLine(lastChord, clef);

    let avgLine = (firstAvgLine + lastAvgLine)/2;

    let direction = avgLine >= 3 ? -1 : 1; // TODO: StemType should match this!!

    let Xs: number[] = [];
    let lines: number[][] = [];

    forEach(beam.elements, (layout, idx) => {
        Xs.push(layout.x$);
        lines.push(IChord.linesForClef(chords[idx], clef));
    });

    let line1 = IChord.startingLine(firstChord, direction, clef);
    let line2 = IChord.startingLine(lastChord, direction, clef);

    let slope = (line2 - line1) / (last(Xs) - first(Xs)) * 10;
    let stemHeight1 = 35;

    // Limit the slope to the range (-50, 50)
    if (slope > 0.5) {
        slope = 0.5;
    }
    if (slope < -0.5) {
        slope = -0.5;
    }

    let intercept = line1*10 + stemHeight1;

    function getStemHeight(direction: number, idx: number, line: number) {
        return intercept * direction +
            (direction === 1 ? 0 : 69) +
            slope * (Xs[idx] - first(Xs)) * direction -
            direction * line * 10;
    }

    // When the slope causes near-collisions, eliminate the slope.
    let minStemHeight = 1000;
    let incrementalIntercept = 0;
    forEach(chords, (chord, idx) => {
        let heightDeterminingLine = IChord.heightDeterminingLine(chord, -direction, clef);

        // Using -direction means that we'll be finding the closest note to the
        // beam. This will help us avoid collisions.
        let stemHeight = getStemHeight(direction, idx, heightDeterminingLine);
        if (stemHeight < minStemHeight) {
            minStemHeight = stemHeight;
            incrementalIntercept = direction*(30 - minStemHeight) + slope * (Xs[idx] - first(Xs));
        }
    });

    if (minStemHeight < 30) {
        intercept += incrementalIntercept;
        slope = 0;
    }

    if (isUnbeamedTuplet) {
        let offsetY = direction > 0 ? -13 : -53;
        forEach(chords, (chord, idx) => {
            let stemStart = IChord.startingLine(chord, direction, clef);

            chord.satieStem = Object.create(firstChord.satieStem);
            chord.satieStem.direction = direction;
            chord.satieStem.stemStart = stemStart;
            chord.satieStem.stemHeight = getStemHeight(direction, idx, stemStart);
        });
        let tuplet: Tuplet = Object.create(beam.tuplet);
        tuplet.placement = direction > 0 ? AboveBelow.Above : AboveBelow.Below;

        let firstStem = firstChord.satieStem;
        let lastStem = lastChord.satieStem;

        firstChord.satieUnbeamedTuplet = {
            beamCount: null,
            direction: direction,
            x: Xs,
            y1: firstStem.stemStart*10 + direction*firstStem.stemHeight + offsetY,
            y2: lastStem.stemStart*10 + direction*lastStem.stemHeight + offsetY,
            tuplet
        };
    } else {
        forEach(chords, (chord, idx) => {
            let stemStart = IChord.startingLine(chord, direction, clef);

            chord.satieStem = Object.create(firstChord.satieStem);
            chord.satieStem.direction = direction;
            chord.satieStem.stemStart = stemStart;
            chord.satieStem.stemHeight = getStemHeight(direction, idx, stemStart);

            chord.satieFlag = null;
        });

        let firstStem = firstChord.satieStem;
        let lastStem = lastChord.satieStem;

        firstChord.satieBeam = {
            beamCount: times(Xs.length, idx => beam.counts[idx]),
            direction: direction,
            x: Xs,
            y1: firstStem.stemStart*10 + direction*firstStem.stemHeight - 30,
            y2: lastStem.stemStart*10 + direction*lastStem.stemHeight - 30,
            tuplet: beam.tuplet
        };
    }
}

export default beam;
