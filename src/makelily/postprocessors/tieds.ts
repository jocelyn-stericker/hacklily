/** 
 * (C) Josh Netterfield <joshua@nettek.ca> 2015.
 * Part of the Satie music engraver <https://github.com/jnetterf/satie>.
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

import {Tied, StartStopContinue} from "musicxml-interfaces";
import {forEach, times, find, List} from "lodash";
import invariant = require("invariant");

import ChordImpl from "../models/chord/chordImpl";
import NoteImpl from "../models/chord/noteImpl";
import {IModel, ILayoutOptions, ILineBounds, IMeasureLayout, IChord} from "../engine";
let {notationObj} = IChord;

interface IMutableTied {
    number: number;
    elements: IModel.ILayout[];
    initial: Tied;
}

type TiedSet = {[id: number]: IMutableTied};

/** 
 * Lays out measures within a bar & justifies.
 * 
 * @returns new end of line
 */
function tied(options: ILayoutOptions, bounds: ILineBounds,
        measures: IMeasureLayout[]): IMeasureLayout[] {
    forEach(measures, measure => {
        // Note that the `number` property of beams does NOT differentiate between sets of beams,
        // as it does with e.g., ties. See `note.mod`.
        let activeTieds: TiedSet = {};
        // Invariant: measure.elements[i].length == measure.elements[j].length for all valid i, j.
        times(measure.elements[0].length, i => {
            forEach(measure.elements, elements => {
                let layout = elements[i];
                let model = layout.model;
                if (!model || layout.renderClass !== IModel.Type.Chord) {
                    return;
                }
                let chord: List<NoteImpl> = <ChordImpl> model;
                let noteWithTieds = find(chord, el => {
                    let notations = notationObj(el);
                    return notations && notations.tieds && notations.tieds.length;
                });

                if (noteWithTieds && noteWithTieds.grace) {
                    // TODO: grace notes
                    return;
                }
                if (!noteWithTieds) {
                    return;
                }
                let notations = notationObj(noteWithTieds);
                let tieds = notations.tieds;
                forEach(tieds, tied => {
                    invariant(isFinite(tied.number) && tied.number !== null,
                        "Tieds must have an ID (tied.number)");
                    let currTied = activeTieds[tied.number];
                    if (currTied) {
                        if (tied.type === StartStopContinue.Start) {
                            console.warn(
                                "Found \"Start\" Tied that continues an existing Tied:",
                                currTied);
                        }
                        currTied.elements.push(layout);
                        terminateTied$(activeTieds, tied);
                    }

                    if (tied.type !== StartStopContinue.Stop) {
                        activeTieds[tied.number] = {
                            number: tied.number,
                            elements: [layout],
                            initial: tied
                        };
                    }
                });
            });
        });
        forEach(activeTieds, (tied, idx) => {
            console.warn(
                "Tied %s was not closed before the end of the measure " +
                "(this will be implemented later!)", idx);
        });
    });
    return measures;
}

function terminateTied$(activeTieds: TiedSet, tied: Tied) {
    (<any>activeTieds[tied.number].initial).satieTieTo = activeTieds[tied.number].elements[1];
    delete activeTieds[tied.number];
}

export default tied;
