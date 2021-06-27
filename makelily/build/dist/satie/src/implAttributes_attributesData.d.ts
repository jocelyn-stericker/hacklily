/**
 * This file is part of Satie music engraver <https://github.com/emilyskidsister/satie>.
 * Copyright (C) Jocelyn Stericker <jocelyn@nettek.ca> 2015 - present.
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
import { Attributes, Key } from "musicxml-interfaces";
import { IAttributesSnapshot } from "./private_attributesSnapshot";
export declare const NUMBER_SPACING = 28;
export declare const PLUS_SPACING = 12;
export declare const CLEF_INDENTATION = 7;
export declare const FLAT_WIDTH = 10;
export declare const DOUBLE_FLAT_WIDTH = 19;
export declare const DOUBLE_SHARP_WIDTH = 13;
export declare const SHARP_WIDTH = 11;
export declare const NATURAL_WIDTH = 11;
/**
 * Returns true if warning Attributes are required at the end of a line, and false otherwise.
 */
export declare function needsWarning(end: Attributes, start: Attributes, staff: number): boolean;
export declare function clefWidth(_attributes: Attributes): number;
export declare function timeWidth(attributes: Attributes): number;
export declare function keyWidth(attributes: Attributes): number;
export declare function clefsEqual(from: Attributes, to: Attributes, staff: number): boolean;
export declare function timesEqual(from: Attributes, to: Attributes): boolean;
export declare function keysEqual(from: Attributes, to: Attributes): boolean;
export declare function approximateWidth(_attributes: IAttributesSnapshot, atEnd?: AtEnd): 80 | 150;
export declare enum AtEnd {
    No = 0,
    Yes = 1
}
export declare function keyWidths(spec: Key): number[];
export declare function getNativeKeyAccidentals(spec: Key): {
    [note: string]: number;
};
