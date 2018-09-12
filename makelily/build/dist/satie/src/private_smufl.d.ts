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
export { default as bravura } from "./private_smufl_bravura";
export declare let bboxes: {
    [key: string]: any[];
};
export declare function getGlyphCode(name: string): string;
/**
 * Calculates where a notation should begin.
 */
export declare function getFontOffset(notehead: string, direction: number): any;
export declare let distances: {
    beam: number;
    hyphen: number;
};
export declare function getWidth(glyph: string): number;
export declare function getRight(glyph: string): number;
export declare function getLeft(glyph: string): number;
export declare function getTop(glyph: string): number;
export declare function getBottom(glyph: string): number;
