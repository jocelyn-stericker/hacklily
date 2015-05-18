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

import MusicXML                 = require("musicxml-interfaces");
import _                        = require("lodash");
import invariant                = require("react/lib/invariant");

import Engine                   = require("../engine");

interface IMutableBeam {
    number: number;
    elements: Engine.IModel.ILayout[];
    initial: MusicXML.Beam;
}

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
        let activeBeams: {[voice: string]: IMutableBeam[]} = {};
        // Invariant: measure.elements[i].length == measure.elements[j].length for all valid i, j.
        _.times(measure.elements[0].length, i => {
            _.forEach(measure.elements, elements => {
                let layout = elements[i];
                let model = layout.model;
                if (!model || layout.renderClass !== Engine.IModel.Type.Chord) {
                    return;
                }
                let chord: Engine.IChord = <any> model;
                let noteWithBeams = _.find(chord, el => !!el.beams);
                if (!noteWithBeams) {
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
                                console.warn("Should not create beam at level %s in voice %s because it already exists", idx, voice);
                            }
                            activeBeams[voice][idx] = {
                                number: idx,
                                elements: [layout],
                                initial: beam
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
                            // console.log("Would now process ", activeBeams[voice][idx]);
                            _.forEach(activeBeams[voice][idx].elements, eLayout => {
                                (<Engine.IChord><any>eLayout.model)[0].printObject = false;
                            });
                            delete activeBeams[voice][idx];
                            break;
                    }
                });
            });
        });
    });
    return measures;
}

export = beam;
