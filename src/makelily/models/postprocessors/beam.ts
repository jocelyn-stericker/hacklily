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

import MusicXML                 = require("musicxml-interfaces");
import _                        = require("lodash");
import invariant                = require("react/lib/invariant");

import Engine                   = require("../engine");
import ChordImpl                = require("../chord/chordImpl");

interface IMutableBeam {
    number: number;
    elements: Engine.IModel.ILayout[];
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
                _.forEach(beams, beam => {
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
                                console.warn("Beam at level %s in voice %s should have been closed before being opened again.", idx, voice);
                                terminateBeam$(voice, idx, activeBeams);
                            }
                            activeBeams[voice][idx] = {
                                number: idx,
                                elements: [layout],
                                initial: beam,
                                attributes: activeAttributes
                            };
                            break;
                        case MusicXML.BeamType.Continue:
                            invariant(voice in activeBeams,
                                "Cannot continue non-existant beam (no beam at all " +
                                "in current voice %s)", voice);
                            invariant(idx in activeBeams[voice], "Cannot continue non-existant " +
                                "beam (no beam at level %s in voice %s)", idx, voice);
                            activeBeams[voice][idx].elements.push(layout);
                            break;
                        case MusicXML.BeamType.BackwardHook:
                        case MusicXML.BeamType.End:
                            invariant(voice in activeBeams, "Cannot end non-existant beam " +
                                "(no beam at all in current voice %s)", voice);
                            invariant(idx in activeBeams[voice], "Cannot end non-existant " +
                                "beam (no beam at level %s in voice %s)", idx, voice);
                            activeBeams[voice][idx].elements.push(layout);
                            terminateBeam$(voice, idx, activeBeams);
                            break;
                    }
                });
            });
        });
        _.forEach(activeBeams, (beams, voice) => {
            _.forEach(beams, (beam, idx) => {
                if (!beam) {
                    return;
                }
                console.warn("Beam in voice %s, level %s was not closed before the end of the measure.", voice, idx);
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

    // y = m*x + b
    var m = chords.length ? 10*(line2 - line1)/(chords.length - 1) : 0;
    var stemHeight1 = 35;
    var stemHeight2 = 35;

    // Limit the slope to the range (-5, 5)
    if (m > 5) {
        stemHeight2 = stemHeight2 - direction*(m - 20)*(chords.length - 1);
        m = 5;
    }
    if (m < -5) {
        stemHeight2 = stemHeight2 - direction*(m + 20)*(chords.length - 1);
        m = -5;
    }

    var dynamicM = m / (Xs[Xs.length - 1] - Xs[0]);

    var b = line1*10 + stemHeight1;

    function getSH(direction: number, idx: number, line: number) {
        return (b * direction +
            (direction === 1 ? 0 : 69) + dynamicM * (Xs[idx] - Xs[0]) * direction) - direction * line * 10;
    }

    // When the slope causes near-collisions, eliminate the slope.
    _.each(chords, (chord, idx) => {
        // Using -direction means that we'll be finding the closest note to the
        // beam. This will help us avoid collisions.
        var sh = getSH(direction, idx, Engine.IChord.startingLine(chord, -direction, clef));
        if (sh < 30) {
            b += direction*(30 - sh);
            m = 0;
        }
    });

    _.forEach(chords, (chord, idx) => {
        chord.satieStem = Object.create(firstChord.satieStem);
        chord.satieStem.direction = direction;
        chord.satieStem.stemStart = Engine.IChord.startingLine(chord, direction, clef);
        chord.satieStem.stemHeight = getSH(direction, idx, Engine.IChord.startingLine(chord, direction, clef));

        chord.satieFlag = null;
    });
}

/*
        return React.DOM.g(null,
            Beam({
                beams: (spec.beams) || C.BeamCount.One,
                variableBeams: spec.variableBeams,
                variableX: spec.variableBeams ? Xs : null,
                direction: direction,
                key: "beam",
                line1: parseFloat("" + line1) +
                    direction * getSH(direction, 0, line1)/10,
                line2: parseFloat("" + line2) +
                    direction * getSH(direction, spec.beam.length - 1, line2)/10,
                stemWidth: 1.4,
                stroke: strokeEnabled ? strokeColor : "#000000",
                tuplet: spec.tuplet,
                tupletsTemporary: spec.tupletsTemporary,
                width: Xs[Xs.length - 1] - Xs[0],
                x: Xs[0], // should assert all in order
                y: Ys[0], // should assert all are equal
            }),
            children
        React.DOM.g);
    }
};
*/

export = beam;
