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
export declare let ptPerMM: number;
export declare let mmPerIn: number;
export declare let V_PADDING: number;
export declare let staveSeperation: number;
export declare let rastalToHeight: number[];
export declare let pageSizes: {
    name: string;
    lilypondName: string;
    width: number;
    height: number;
    unit: string;
}[];
export declare function defaultPageSize(): {
    name: string;
    lilypondName: string;
    width: number;
    height: number;
    unit: string;
};
export declare let defaultIndent: number;
export declare let defaultMargins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
};
export declare let defaultStaveHeight: number;
export declare let lilypondSizes: {
    "choral": {
        width: number;
        height: number;
        unit: string;
    };
    "marching": {
        width: number;
        height: number;
        unit: string;
    };
    "a10": {
        width: number;
        height: number;
        unit: string;
    };
    "a9": {
        width: number;
        height: number;
        unit: string;
    };
    "a8": {
        width: number;
        height: number;
        unit: string;
    };
    "a7": {
        width: number;
        height: number;
        unit: string;
    };
    "a6": {
        width: number;
        height: number;
        unit: string;
    };
    "a5": {
        width: number;
        height: number;
        unit: string;
    };
    "a4": {
        width: number;
        height: number;
        unit: string;
    };
    "a3": {
        width: number;
        height: number;
        unit: string;
    };
    "a2": {
        width: number;
        height: number;
        unit: string;
    };
    "a1": {
        width: number;
        height: number;
        unit: string;
    };
    "a0": {
        width: number;
        height: number;
        unit: string;
    };
    "b10": {
        width: number;
        height: number;
        unit: string;
    };
    "b9": {
        width: number;
        height: number;
        unit: string;
    };
    "b8": {
        width: number;
        height: number;
        unit: string;
    };
    "b7": {
        width: number;
        height: number;
        unit: string;
    };
    "b6": {
        width: number;
        height: number;
        unit: string;
    };
    "b5": {
        width: number;
        height: number;
        unit: string;
    };
    "b4": {
        width: number;
        height: number;
        unit: string;
    };
    "b3": {
        width: number;
        height: number;
        unit: string;
    };
    "b2": {
        width: number;
        height: number;
        unit: string;
    };
    "b1": {
        width: number;
        height: number;
        unit: string;
    };
    "b0": {
        width: number;
        height: number;
        unit: string;
    };
    "4a0": {
        width: number;
        height: number;
        unit: string;
    };
    "2a0": {
        width: number;
        height: number;
        unit: string;
    };
    "c10": {
        width: number;
        height: number;
        unit: string;
    };
    "c9": {
        width: number;
        height: number;
        unit: string;
    };
    "c8": {
        width: number;
        height: number;
        unit: string;
    };
    "c7": {
        width: number;
        height: number;
        unit: string;
    };
    "c6": {
        width: number;
        height: number;
        unit: string;
    };
    "c5": {
        width: number;
        height: number;
        unit: string;
    };
    "c4": {
        width: number;
        height: number;
        unit: string;
    };
    "c3": {
        width: number;
        height: number;
        unit: string;
    };
    "c2": {
        width: number;
        height: number;
        unit: string;
    };
    "c1": {
        width: number;
        height: number;
        unit: string;
    };
    "c0": {
        width: number;
        height: number;
        unit: string;
    };
    "junior-legal": {
        width: number;
        height: number;
        unit: string;
    };
    "legal": {
        width: number;
        height: number;
        unit: string;
    };
    "ledger": {
        width: number;
        height: number;
        unit: string;
    };
    "letter": {
        width: number;
        height: number;
        unit: string;
    };
    "tabloid": {
        width: number;
        height: number;
        unit: string;
    };
    "11x17": {
        width: number;
        height: number;
        unit: string;
    };
    "17x11": {
        width: number;
        height: number;
        unit: string;
    };
    "government-letter": {
        width: number;
        height: number;
        unit: string;
    };
    "government-legal": {
        width: number;
        height: number;
        unit: string;
    };
    "philippine-legal": {
        width: number;
        height: number;
        unit: string;
    };
    "ansi a": {
        width: number;
        height: number;
        unit: string;
    };
    "ansi b": {
        width: number;
        height: number;
        unit: string;
    };
    "ansi c": {
        width: number;
        height: number;
        unit: string;
    };
    "ansi d": {
        width: number;
        height: number;
        unit: string;
    };
    "ansi e": {
        width: number;
        height: number;
        unit: string;
    };
    "engineering f": {
        width: number;
        height: number;
        unit: string;
    };
    "arch a": {
        width: number;
        height: number;
        unit: string;
    };
    "arch b": {
        width: number;
        height: number;
        unit: string;
    };
    "arch c": {
        width: number;
        height: number;
        unit: string;
    };
    "arch d": {
        width: number;
        height: number;
        unit: string;
    };
    "arch e": {
        width: number;
        height: number;
        unit: string;
    };
    "arch e1": {
        width: number;
        height: number;
        unit: string;
    };
    "statement": {
        width: number;
        height: number;
        unit: string;
    };
    "half letter": {
        width: number;
        height: number;
        unit: string;
    };
    "quarto": {
        width: number;
        height: number;
        unit: string;
    };
    "octavo": {
        width: number;
        height: number;
        unit: string;
    };
    "executive": {
        width: number;
        height: number;
        unit: string;
    };
    "monarch": {
        width: number;
        height: number;
        unit: string;
    };
    "foolscap": {
        width: number;
        height: number;
        unit: string;
    };
    "folio": {
        width: number;
        height: number;
        unit: string;
    };
    "super-b": {
        width: number;
        height: number;
        unit: string;
    };
    "post": {
        width: number;
        height: number;
        unit: string;
    };
    "crown": {
        width: number;
        height: number;
        unit: string;
    };
    "large post": {
        width: number;
        height: number;
        unit: string;
    };
    "demy": {
        width: number;
        height: number;
        unit: string;
    };
    "medium": {
        width: number;
        height: number;
        unit: string;
    };
    "broadsheet": {
        width: number;
        height: number;
        unit: string;
    };
    "royal": {
        width: number;
        height: number;
        unit: string;
    };
    "elephant": {
        width: number;
        height: number;
        unit: string;
    };
    "double demy": {
        width: number;
        height: number;
        unit: string;
    };
    "quad demy": {
        width: number;
        height: number;
        unit: string;
    };
    "atlas": {
        width: number;
        height: number;
        unit: string;
    };
    "imperial": {
        width: number;
        height: number;
        unit: string;
    };
    "antiquarian": {
        width: number;
        height: number;
        unit: string;
    };
    "pa0": {
        width: number;
        height: number;
        unit: string;
    };
    "pa1": {
        width: number;
        height: number;
        unit: string;
    };
    "pa2": {
        width: number;
        height: number;
        unit: string;
    };
    "pa3": {
        width: number;
        height: number;
        unit: string;
    };
    "pa4": {
        width: number;
        height: number;
        unit: string;
    };
    "pa5": {
        width: number;
        height: number;
        unit: string;
    };
    "pa6": {
        width: number;
        height: number;
        unit: string;
    };
    "pa7": {
        width: number;
        height: number;
        unit: string;
    };
    "pa8": {
        width: number;
        height: number;
        unit: string;
    };
    "pa9": {
        width: number;
        height: number;
        unit: string;
    };
    "pa10": {
        width: number;
        height: number;
        unit: string;
    };
    "f4": {
        width: number;
        height: number;
        unit: string;
    };
    "a8landscape": {
        width: number;
        height: number;
        unit: string;
    };
};
/**
 * Converts a length in mms to tenths of a standard stave height.
 *
 * @param scaling40 the standard stave height
 */
export declare function mmToTenths(scaling40: number, mm: number): number;
/**
 * Converts a 'px' size or a named css size (e.g., "small") to tenths of a standard stave height.
 *
 * @param scaling40 the standard stave height
 */
export declare function cssSizeToTenths(scaling40: number, css: string): number;
/**
 * Converts a length in tenths of a stave length to mm.
 *
 * @param scaling40 the standard stave height
 */
export declare function tenthsToMM(scaling40: number, tenths: number): number;
