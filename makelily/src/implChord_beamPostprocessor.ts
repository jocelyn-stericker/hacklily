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

/**
 * @file Creates beams and tuplets
 */

import {Attributes, Beam, BeamType, StartStop, Tuplet, AboveBelow} from "musicxml-interfaces";
import {some, chain, forEach, find, map, sortBy, times, first, last} from "lodash";
import * as invariant from "invariant";

import Type from "./document_types";

import ChordModel from "./implChord_chordModel";

import {IMeasureLayout} from "./private_measureLayout";
import {ILayout} from "./document_model";
import {ILayoutOptions} from "./private_layoutOptions";
import {ILineBounds} from "./private_lineBounds";
import {IAttributesSnapshot} from "./private_attributesSnapshot";
import {IChord, averageLine, startingLine, linesForClef,
    heightDeterminingLine} from "./private_chordUtil";

type IDetachedChordModel = ChordModel.IDetachedChordModel;

interface IMutableBeam {
    number: number;
    elements: ILayout[];
    counts: number[];
    attributes: IAttributesSnapshot;
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
                if (model && layout.renderClass === Type.Attributes) {
                    activeAttributes = <any> model;
                }
                if (!model || layout.renderClass !== Type.Chord) {
                    return;
                }
                let chord: IChord = <any> model;
                let targetNote = find(chord, note => !!note.beams);
                let startTuplet: Tuplet;
                let stopTuplet: Tuplet;
                forEach(chord, note => {
                    forEach(note.notations, notation => {
                       forEach(notation.tuplets, aTuplet => {
                           targetNote = targetNote || note;
                           if (aTuplet.type === StartStop.Start) {
                               startTuplet = aTuplet;
                           } else {
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

                let anyInvalid = some(sortBy(beams), (beam, idx) => {
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

                if (!beams.length && startTuplet) {
                    activeUnbeamedTuplets[voice] = activeUnbeamedTuplets[voice] || [];
                    activeUnbeamedTuplets[voice][startTuplet.number || 1] = {
                        number: startTuplet.number || 1,
                        elements: [layout],
                        initial: null,
                        attributes: (<any>activeAttributes)._snapshot,
                        counts: [1],
                        tuplet: startTuplet
                    };
                } else {
                    forEach(activeUnbeamedTuplets[voice], unbeamedTuplet => {
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

                chain(beams).sortBy("number").forEach(beam => {
                    let idx = beam.number;
                    invariant(!!idx, "A beam's number must be defined in MusicXML.");
                    invariant(!!voice, "A beam's voice must be defined in MusicXML.");
                    activeBeams[voice] = activeBeams[voice] || [];
                    switch (beam.type) {
                        case BeamType.Begin:
                        case BeamType.BackwardHook:
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
                                tuplet: startTuplet
                            };
                            let counts = activeBeams[voice][1].counts;
                            if (idx !== 1) {
                                counts[counts.length - 1]++;
                            }
                            if (beam.type === BeamType.Begin) {
                                break;
                            }
                            // Passthrough for BackwardHook and ForwardHook, which are single note things
                        case BeamType.End:
                            invariant(voice in activeBeams, "Cannot end non-existant beam " +
                                "(no beam at all in current voice %s)", voice);
                            invariant(idx in activeBeams[voice], "Cannot end non-existant " +
                                "beam (no beam at level %s in voice %s)", idx, voice);
                            activeBeams[voice][idx].elements.push(layout);

                            counts = activeBeams[voice][1].counts;

                            if (beam.type === BeamType.End) {
                                if (idx === 1) {
                                    counts.push(1);
                                } else {
                                    counts[counts.length - 1]++;
                                }
                            }
                            toTerminate.push({
                                voice: voice,
                                idx: idx,
                                isUnbeamedTuplet: false,
                                beamSet: activeBeams
                            });

                            let groupTuplet = activeBeams[voice][idx].tuplet;
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
                        default:
                            throw new Error(`Unknown type ${beam.type}`);
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
    let chords: IDetachedChordModel[] = map(beam.elements, eLayout => <any> eLayout.model);
    let firstChord = first(chords);
    let lastChord = last(chords);
    let {clef} = beam.attributes;

    let firstAvgLine = averageLine(firstChord, clef);
    let lastAvgLine = averageLine(lastChord, clef);

    let avgLine = (firstAvgLine + lastAvgLine) / 2;

    let direction = avgLine >= 3 ? -1 : 1; // TODO: StemType should match this!!

    let Xs: number[] = [];
    let lines: number[][] = [];

    forEach(beam.elements, (layout, idx) => {
        Xs.push(layout.x$);
        lines.push(linesForClef(chords[idx], clef));
    });

    let line1 = startingLine(firstChord, direction, clef);
    let line2 = startingLine(lastChord, direction, clef);

    let slope = (line2 - line1) / (last(Xs) - first(Xs)) * 10;
    let stemHeight1 = 35;

    // Limit the slope to the range (-50, 50)
    if (slope > 0.5) {
        slope = 0.5;
    }
    if (slope < -0.5) {
        slope = -0.5;
    }

    let intercept = line1 * 10 + stemHeight1;

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
        let currHeightDeterminingLine = heightDeterminingLine(chord, direction, clef);

        let stemHeight = getStemHeight(direction, idx, currHeightDeterminingLine);
        if (stemHeight < minStemHeight) {
            minStemHeight = stemHeight;
            incrementalIntercept = direction * (30 - minStemHeight) + slope * (Xs[idx] - first(Xs));
        }
    });

    if (minStemHeight < 30) {
        intercept += incrementalIntercept;
        slope = 0;
    }

    if (slope === 0 && intercept >= 0 && intercept <= 50) {
        intercept += direction * (10 - (intercept % 10));
    }

    const layouts = beam.elements as any as ChordModel.IChordLayout[];
    if (isUnbeamedTuplet) {
        let offsetY = direction > 0 ? -13 : -53;
        forEach(layouts, (chordLayout, idx) => {
            let stemStart = startingLine(chordLayout.model, direction, clef);
            let stemHeight = getStemHeight(direction, idx, stemStart);
            invariant(chords.length === 1 || isFinite(stemHeight), "stemHeight must be defined for 2+ notes");
            chordLayout.satieStem = {
                direction,
                stemStart,
                stemHeight,
                tremolo: first(layouts).satieStem ? first(layouts).satieStem.tremolo : null,
            };
        });
        let tuplet: Tuplet = Object.create(beam.tuplet);
        tuplet.placement = direction > 0 ? AboveBelow.Above : AboveBelow.Below;

        let firstStem = first(layouts).satieStem;
        let lastStem = last(layouts).satieStem;

        firstChord.satieUnbeamedTuplet = {
            beamCount: null,
            direction: direction,
            x: Xs,
            y1: firstStem.stemStart * 10 + direction * firstStem.stemHeight + offsetY,
            y2: lastStem.stemStart * 10 + direction * lastStem.stemHeight + offsetY,
            tuplet
        };
    } else {
        forEach(layouts, (chordLayout, idx) => {
            let stemStart = startingLine(chordLayout.model, direction, clef);
            let stemHeight = getStemHeight(direction, idx, stemStart);

            chordLayout.satieStem = {
                direction,
                stemStart,
                stemHeight,
                tremolo: layouts[0].satieStem ? layouts[0].satieStem.tremolo : null,
            };

            chordLayout.satieFlag = null;
        });

        let firstStem = first(layouts).satieStem;
        let lastStem = last(layouts).satieStem;
        let firstLayout = first(beam.elements) as any as ChordModel.IChordLayout;

        firstLayout.satieBeam = {
            beamCount: times(Xs.length, idx => beam.counts[idx]),
            direction: direction,
            x: Xs,
            y1: firstStem.stemStart * 10 + direction * firstStem.stemHeight - 30,
            y2: lastStem.stemStart * 10 + direction * lastStem.stemHeight - 30,
            tuplet: beam.tuplet
        };
    }
}

export default beam;
