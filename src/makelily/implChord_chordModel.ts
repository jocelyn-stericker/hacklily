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
 * @file models/chord.ts A model that represents 1 or more notes in the same
 * voice, starting on the same beat, and each with the same duration. Any
 * number of these notes may be rests.
 */

import {MultipleRest, Tremolo} from "musicxml-interfaces";

import {IModel, ILayout, Type} from "./document";

import {IChord} from "./private_chordUtil";

import {IBeamLayout} from "./implChord_beamLayout";
import ChordModelImpl from "./implChord_chordImpl";

/**
 * Registers Chord in the factory structure passed in.
 */
function ChordModel(constructors: { [key: number]: any; [key: string]: Type }) {
    constructors["Note"] = Type.Chord;
    constructors[Type.Chord] = ChordModelImpl;
}

module ChordModel {
    export interface IChordModel extends IModel, IChord {
    }
    export interface IDetachedChordModel extends IModel, IChord {
        satieLedger: number[];
        noteheadGlyph: string[];
        satieMultipleRest: MultipleRest;
        satieUnbeamedTuplet: IBeamLayout;
    }
    export interface IChordLayout extends ILayout {
        model: IDetachedChordModel;
        minSpaceBefore: number;
        minSpaceAfter: number;
        satieBeam: IBeamLayout;
        satieStem: {
            direction: number;
            stemHeight: number;
            stemStart: number;
            tremolo?: Tremolo;
        };
        satieFlag: string;
    }
}

export default ChordModel;
