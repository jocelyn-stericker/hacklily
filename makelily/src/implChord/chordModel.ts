/**
 * @source: https://github.com/jnetterf/satie/
 *
 * @license
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

/**
 * @file models/chord.ts A model that represents 1 or more notes in the same
 * voice, starting on the same beat, and each with the same duration. Any
 * number of these notes may be rests.
 */

import {MultipleRest, Tremolo} from "musicxml-interfaces";

import IModel from "../document/model";
import Type from "../document/types";

import ILayout from "../private/layout";
import IChord from "../private/chord";

import IBeamLayout from "./beamLayout";
import ChordModelImpl from "./chordImpl"; // @cyclic

/**
 * Registers Chord in the factory structure passed in.
 */
function ChordModel(constructors: { [key: number]: any; [key: string]: Type }) {
    constructors["Note"] = Type.Chord;
    constructors[Type.Chord] = ChordModelImpl;
}

module ChordModel {
    export interface IBaseModel {
        satieStem: {
            direction: number;
            stemHeight: number;
            stemStart: number;
            tremolo?: Tremolo;
        };
        satieFlag: string;
        satieLedger: number[];
        noteheadGlyph: string[];
        satieMultipleRest: MultipleRest;
        satieUnbeamedTuplet: IBeamLayout;
    }
    export interface IChordModel extends IBaseModel, IModel, IChord {
    }
    export interface IDetachedChordModel extends IModel, IChord {
        baseModel: IBaseModel;
    }
    export interface IChordLayout extends ILayout {
        model: IDetachedChordModel;
        minSpaceBefore: number;
        minSpaceAfter: number;
        satieBeam: IBeamLayout;
        freshest(): IChordLayout;
    }
}

export default ChordModel;
