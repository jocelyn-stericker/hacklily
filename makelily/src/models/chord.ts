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
 * @file models/chord.ts A model that represents 1 or more notes in the same
 * voice, starting on the same beat, and each with the same duration. Any
 * number of these notes may be rests.
 */

import MusicXML         = require("musicxml-interfaces");

import Engine           = require("./engine");
import ChordModelImpl   = require("./chord/chordImpl"); // @cyclic

/**
 * Registers Chord in the factory structure passed in.
 */
 function ChordModel(constructors: { [key: number]: any; [key: string]: Engine.IModel.Type }) {
    constructors["Note"] = Engine.IModel.Type.Chord;
    constructors[Engine.IModel.Type.Chord] = ChordModelImpl;
}

module ChordModel {
    export interface IChordModel extends Engine.IModel, Engine.IChord {
        satieStem: {
            direction:  number;
            stemHeight: number;
            stemStart:  number;
        };
        satieBeam: Engine.IBeam.ILayout;
        satieFlag: string;
        satieLedger: number[];
        satieNotehead: string[];
        satieMultipleRest: MusicXML.MultipleRest;
    }

    export interface IChordLayout extends Engine.IModel.ILayout {
        model: IChordModel;
    }
}

export = ChordModel;
