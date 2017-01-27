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

import {Key, Clef, Accidental, MxmlAccidental} from "musicxml-interfaces";
import {createFactory, Component, DOM} from "react";
import {times, map} from "lodash";

import AccidentalView from "./implAttributes_accidentalView";
import {keyWidths} from "./implAttributes_attributesData";

import {lineForClef_} from "./private_chordUtil";

const $AccidentalView = createFactory(AccidentalView);

// TODO: this almost looks like logic -- move.
const sharps: { [key: string]: Array<number> } = {
    // "FCGDAEB"
    alto: [4.5, 3, 5, 3.5, 2, 4, 2.5],
    bass: [4, 2.5, 4.5, 3, 1.5, 3.5, 2],
    tenor: [2, 4, 2.5, 4.5, 3, 5, 3.5],
    treble: [5, 3.5, 5.5, 4, 2.5, 4.5, 3]
};

const flats: { [key: string]: Array<number> } = {
    // "BEADGCF"
    alto: [2.5, 4, 2, 3.5, 1.5, 3, 1],
    bass: [2, 3.5, 1.5, 3, 1, 2.5, 0.5],
    tenor: [3.5, 5, 3, 4.5, 2.5, 4, 2],
    treble: [3, 4.5, 2.5, 4, 2, 3.5, 1.5]
};

/**
 * Renders a key signature.
 */
class KeyView extends Component<{spec: Key; clef: Clef}, void> {
    render(): any {
        return DOM.g(null,
            map(this.getAccidentals(),
                (accidental, idx) => $AccidentalView({
                    key: idx,
                    spec: accidental
                })
            /* map */)
        /* DOM.g */);
    }

    /**
     * Returns an array representing the position and glyphName of each accidental.
     */
    getAccidentals(): Accidental[] {
        // TODO: this is expensive -- compute in attributes!
        let spec = this.props.spec;
        let clef = this.props.clef;
        let widths = keyWidths(spec);
        let positions: number[] = [];
        let x = 0;

        if (spec.fifths) {
            let accCount = Math.min(7, Math.abs(spec.fifths));
            let idxes = times(accCount, i => (i + Math.max(0, Math.abs(spec.fifths) - 7)) % 7);
            for (let i = 0; i < idxes.length; ++i) {
                positions.push(x);
                x += widths[idxes[i]];
            }
            return map(idxes, i => makeAccidentalFromSharps(idxes, i, spec.fifths >= 0));
        }

        for (let i = 0; i < widths.length; ++i) {
            positions.push(x);
            x += widths[i];
        }

        if (spec.keySteps) {
            return map(spec.keySteps, (keyStep, idx) => {
                let keyAlters = spec.keyAlters[idx];
                let hasOctave = spec.keyOctaves && spec.keyOctaves[idx];
                let octave = hasOctave ? spec.keyOctaves[idx].octave : null;
                if (octave === null) {
                    while (lineForClef_(keyStep, octave, this.props.clef) < 2) {
                        ++octave;
                    }
                }
                let line = lineForClef_(keyStep, octave, this.props.clef);
                let accidental: MxmlAccidental = null;
                switch (keyAlters) {
                    case "-2":
                        accidental = MxmlAccidental.DoubleFlat;
                        break;
                    case "-1.5":
                        accidental = MxmlAccidental.ThreeQuartersFlat;
                        break;
                    case "-1":
                        accidental = MxmlAccidental.Flat;
                        break;
                    case "-0.5":
                        accidental = MxmlAccidental.QuarterFlat;
                        break;
                    case "0":
                        accidental = MxmlAccidental.Natural;
                        break;
                    case "0.5":
                        accidental = MxmlAccidental.QuarterSharp;
                        break;
                    case "1":
                        accidental = MxmlAccidental.Sharp;
                        break;
                    case "1.5":
                        accidental = MxmlAccidental.ThreeQuartersSharp;
                        break;
                    case "2":
                        accidental = MxmlAccidental.DoubleSharp;
                        break;
                    default:
                        console.warn("Unknown accidental ", keyAlters);
                        accidental = MxmlAccidental.Natural;
                }

                return {
                    accidental: accidental,
                    color: spec.color,
                    defaultX: spec.defaultX + positions[idx],
                    defaultY: spec.defaultY + (line - 3) * 10,
                    relativeX: spec.relativeX,
                    relativeY: (spec.relativeY || 0)
                };
            });
        }

        function makeAccidentalFromSharps(idxes: number[], i: number, sharp: boolean): Accidental {
            let accidental: MxmlAccidental;
            switch (true) {
                case (sharp && 7 + idxes[i] < spec.fifths):
                    accidental = MxmlAccidental.DoubleSharp;
                    break;
                case (sharp && 7 + idxes[i] >= spec.fifths):
                    accidental = MxmlAccidental.Sharp;
                    break;
                case (!sharp && (7 + idxes[i] < -spec.fifths)):
                    accidental = MxmlAccidental.DoubleFlat;
                    break;
                case (!sharp && (7 + idxes[i] >= -spec.fifths)):
                    accidental = MxmlAccidental.Flat;
                    break;
                default:
                    throw new Error("Impossible!");
            }

            let line = (sharp ? sharps : flats)[standardClef(clef)][idxes[i]];

            return {
                accidental: accidental,
                color: spec.color,
                defaultX: spec.defaultX + positions[i],
                defaultY: spec.defaultY + (line - 3) * 10,
                relativeX: spec.relativeX,
                relativeY: (spec.relativeY || 0)
            };
        }
    }
};

function standardClef(clef: Clef) {
    switch (true) {
        case (clef.sign === "G"):
            return "treble";
        case (clef.sign === "F"):
            return "bass";
        case (clef.sign === "C" && clef.line === 3):
            return "alto";
        case (clef.sign === "C" && clef.line === 4):
            return "tenor";
        default:
            console.warn("Invalid clef?");
            return "treble";
    }
};

export default KeyView;
