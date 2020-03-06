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
import { Articulations, Placement, Notations, PrintStyle, Note, Technical } from "musicxml-interfaces";
import { IBoundingRect } from "./private_boundingRect";
import { IChordLayout } from "./implChord_chordModel";
export declare function articulationDirectionMatters(model: Articulations): boolean;
export declare function articulationGlyph(model: Articulations, direction: string): string;
export declare function technicalGlyph(model: Technical, direction: string): string;
export interface IGeneralNotation extends PrintStyle, Placement {
    _snapshot?: IGeneralNotation;
}
export declare function getBoundingRects(model: Notations, note: Note, chord: IChordLayout): {
    bb: IBoundingRect[];
    n: Notations;
};
