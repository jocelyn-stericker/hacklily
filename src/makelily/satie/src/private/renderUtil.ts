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

export let ptPerMM = 2.842;

export let mmPerIn = 25.4;

export let V_PADDING = 20;

export let staveSeperation = 3.24;

export let rastalToHeight = [
    /* largest is '0' */
    9.2, // educational
    7.9, // educational
    7.4, // piano (uncommon)
    7, // single stave / piano
    6.5, // single stave / piano
    6, // single stave (uncommon) / piano (uncommon)
    5.5, // choral, cue staves, or ossia
    4.8, // choral, cue staves, or ossia
    3.7 // full score
    // Tags from Behind Bars by Elaine Gould, pp. 483
];
export let pageSizes = [
    // Sizes to actually display
    // (For other sizes, Google works well enough :-)
    {
        name: "U.S. Letter",
        lilypondName: "letter",
        width: 215.9,
        height: 279.4,
        unit: "mm"
    },
    {
        name: "U.S. Legal",
        lilypondName: "legal",
        width: 215.9,
        height: 355.6,
        unit: "mm"
    },
    {
        name: "ISO A4",
        lilypondName: "a4",
        width: 210,
        height: 297,
        unit: "mm"
    },
    {
        name: "ISO B4",
        lilypondName: "b4",
        width: 250,
        height: 353,
        unit: "mm"
    },
    {
        name: "ISO A3",
        lilypondName: "a3",
        width: 297,
        height: 420,
        unit: "mm"
    },
    {
        name: "Print",
        lilypondName: "arch a",
        width: 229,
        height: 305,
        unit: "mm"
    },
    {
        name: "Choral",
        lilypondName: "choral", // XXX: Common format, but does not exist in lilypond
        width: 178,
        height: 254,
        unit: "mm"
    },
    {
        name: "Marching Band",
        lilypondName: "marching",  // XXX: Common format, but does not exist in lilypond
        width: 133,
        height: 170,
        unit: "mm"
    }
];

export function defaultPageSize() {
    return pageSizes[0];
};

export let defaultIndent = 15;
export let defaultMargins = {
    top: 15.25,
    right: 15.25,
    bottom: 15.25,
    left: 15.25
};

// This means that 4 spaces (i.e., 1 stave) equals 6.3mm.
export let defaultStaveHeight = rastalToHeight[4];

export let lilypondSizes = {
    // Sizes that we support loading from Lilypond.
    // Did you know there were this many sizes?
    "choral": { // XXX: Common format, but does not exist in lilypond
        width: 178,
        height: 254,
        unit: "mm"
    },
    "marching": {  // XXX: Common format, but does not exist in lilypond
        width: 133,
        height: 170,
        unit: "mm"
    },
    "a10": {
        width: 26,
        height: 37,
        unit: "mm"
    },
    "a9": {
        width: 37,
        height: 52,
        unit: "mm"
    },
    "a8": {
        width: 52,
        height: 74,
        unit: "mm"
    },
    "a7": {
        width: 74,
        height: 105,
        unit: "mm"
    },
    "a6": {
        width: 105,
        height: 148,
        unit: "mm"
    },
    "a5": {
        width: 148,
        height: 210,
        unit: "mm"
    },
    "a4": {
        width: 210,
        height: 297,
        unit: "mm"
    },
    "a3": {
        width: 297,
        height: 420,
        unit: "mm"
    },
    "a2": {
        width: 420,
        height: 594,
        unit: "mm"
    },
    "a1": {
        width: 594,
        height: 841,
        unit: "mm"
    },
    "a0": {
        width: 841,
        height: 1189,
        unit: "mm"
    },
    "b10": {
        width: 31,
        height: 44,
        unit: "mm"
    },
    "b9": {
        width: 44,
        height: 62,
        unit: "mm"
    },
    "b8": {
        width: 62,
        height: 88,
        unit: "mm"
    },
    "b7": {
        width: 88,
        height: 125,
        unit: "mm"
    },
    "b6": {
        width: 125,
        height: 176,
        unit: "mm"
    },
    "b5": {
        width: 176,
        height: 250,
        unit: "mm"
    },
    "b4": {
        width: 250,
        height: 353,
        unit: "mm"
    },
    "b3": {
        width: 353,
        height: 500,
        unit: "mm"
    },
    "b2": {
        width: 500,
        height: 707,
        unit: "mm"
    },
    "b1": {
        width: 707,
        height: 1000,
        unit: "mm"
    },
    "b0": {
        width: 1000,
        height: 1414,
        unit: "mm"
    },
    "4a0": {
        width: 1682,
        height: 2378,
        unit: "mm"
    },
    "2a0": {
        width: 1189,
        height: 1682,
        unit: "mm"
    },
    "c10": {
        width: 28,
        height: 40,
        unit: "mm"
    },
    "c9": {
        width: 40,
        height: 57,
        unit: "mm"
    },
    "c8": {
        width: 57,
        height: 81,
        unit: "mm"
    },
    "c7": {
        width: 81,
        height: 114,
        unit: "mm"
    },
    "c6": {
        width: 114,
        height: 162,
        unit: "mm"
    },
    "c5": {
        width: 162,
        height: 229,
        unit: "mm"
    },
    "c4": {
        width: 229,
        height: 324,
        unit: "mm"
    },
    "c3": {
        width: 324,
        height: 458,
        unit: "mm"
    },
    "c2": {
        width: 458,
        height: 648,
        unit: "mm"
    },
    "c1": {
        width: 648,
        height: 917,
        unit: "mm"
    },
    "c0": {
        width: 917,
        height: 1297,
        unit: "mm"
    },
    "junior-legal": {
        width: 8.0,
        height: 5.0,
        unit: "in"
    },
    "legal": {
        width: 8.5,
        height: 14.0,
        unit: "in"
    },
    "ledger": {
        width: 17.0,
        height: 11.0,
        unit: "in"
    },
    "letter": {
        width: 8.5,
        height: 11.0,
        unit: "in"
    },
    "tabloid": {
        width: 11.0,
        height: 17.0,
        unit: "in"
    },
    "11x17": {
        width: 11.0,
        height: 17.0,
        unit: "in"
    },
    "17x11": {
        width: 17.0,
        height: 11.0,
        unit: "in"
    },
    "government-letter": {
        width: 8,
        height: 10.5,
        unit: "in"
    },
    "government-legal": {
        width: 8.5,
        height: 13.0,
        unit: "in"
    },
    "philippine-legal": {
        width: 8.5,
        height: 13.0,
        unit: "in"
    },
    "ansi a": {
        width: 8.5,
        height: 11.0,
        unit: "in"
    },
    "ansi b": {
        width: 17.0,
        height: 11.0,
        unit: "in"
    },
    "ansi c": {
        width: 17.0,
        height: 22.0,
        unit: "in"
    },
    "ansi d": {
        width: 22.0,
        height: 34.0,
        unit: "in"
    },
    "ansi e": {
        width: 34.0,
        height: 44.0,
        unit: "in"
    },
    "engineering f": {
        width: 28.0,
        height: 40.0,
        unit: "in"
    },
    "arch a": {
        width: 9.0,
        height: 12.0,
        unit: "in"
    },
    "arch b": {
        width: 12.0,
        height: 18.0,
        unit: "in"
    },
    "arch c": {
        width: 18.0,
        height: 24.0,
        unit: "in"
    },
    "arch d": {
        width: 24.0,
        height: 36.0,
        unit: "in"
    },
    "arch e": {
        width: 36.0,
        height: 48.0,
        unit: "in"
    },
    "arch e1": {
        width: 30.0,
        height: 42.0,
        unit: "in"
    },
    "statement": {
        width: 5.5,
        height: 8.5,
        unit: "in"
    },
    "half letter": {
        width: 5.5,
        height: 8.5,
        unit: "in"
    },
    "quarto": {
        width: 8.0,
        height: 10.0,
        unit: "in"
    },
    "octavo": {
        width: 6.75,
        height: 10.5,
        unit: "in"
    },
    "executive": {
        width: 7.25,
        height: 10.5,
        unit: "in"
    },
    "monarch": {
        width: 7.25,
        height: 10.5,
        unit: "in"
    },
    "foolscap": {
        width: 8.27,
        height: 13.0,
        unit: "in"
    },
    "folio": {
        width: 8.27,
        height: 13.0,
        unit: "in"
    },
    "super-b": {
        width: 13.0,
        height: 19.0,
        unit: "in"
    },
    "post": {
        width: 15.5,
        height: 19.5,
        unit: "in"
    },
    "crown": {
        width: 15.0,
        height: 20.0,
        unit: "in"
    },
    "large post": {
        width: 16.5,
        height: 21.0,
        unit: "in"
    },
    "demy": {
        width: 17.5,
        height: 22.5,
        unit: "in"
    },
    "medium": {
        width: 18.0,
        height: 23.0,
        unit: "in"
    },
    "broadsheet": {
        width: 18.0,
        height: 24.0,
        unit: "in"
    },
    "royal": {
        width: 20.0,
        height: 25.0,
        unit: "in"
    },
    "elephant": {
        width: 23.0,
        height: 28.0,
        unit: "in"
    },
    "double demy": {
        width: 22.5,
        height: 35.0,
        unit: "in"
    },
    "quad demy": {
        width: 35.0,
        height: 45.0,
        unit: "in"
    },
    "atlas": {
        width: 26.0,
        height: 34.0,
        unit: "in"
    },
    "imperial": {
        width: 22.0,
        height: 30.0,
        unit: "in"
    },
    "antiquarian": {
        width: 31.0,
        height: 53.0,
        unit: "in"
    },
    "pa0": {
        width: 840,
        height: 1120,
        unit: "mm"
    },
    "pa1": {
        width: 560,
        height: 840,
        unit: "mm"
    },
    "pa2": {
        width: 420,
        height: 560,
        unit: "mm"
    },
    "pa3": {
        width: 280,
        height: 420,
        unit: "mm"
    },
    "pa4": {
        width: 210,
        height: 280,
        unit: "mm"
    },
    "pa5": {
        width: 140,
        height: 210,
        unit: "mm"
    },
    "pa6": {
        width: 105,
        height: 140,
        unit: "mm"
    },
    "pa7": {
        width: 70,
        height: 105,
        unit: "mm"
    },
    "pa8": {
        width: 52,
        height: 70,
        unit: "mm"
    },
    "pa9": {
        width: 35,
        height: 52,
        unit: "mm"
    },
    "pa10": {
        width: 26,
        height: 35,
        unit: "mm"
    },
    "f4": {
        width: 210,
        height: 330,
        unit: "mm"
    },
    "a8landscape": {
        width: 74,
        height: 52,
        unit: "mm"
    }

};

/**
 * Converts a length in mms to tenths of a standard stave height.
 * 
 * @param scaling40 the standard stave height
 */
export function mmToTenths(scaling40: number, mm: number) {
    return mm / scaling40 * 40;
}

/**
 * Converts a 'px' size or a named css size (e.g., "small") to tenths of a standard stave height.
 * 
 * @param scaling40 the standard stave height
 */
export function cssSizeToTenths(scaling40: number, css: string) {
    let px = NaN;
    // The xx-small - xx-large values were found from Chrome computed sizes.
    switch (true) {
        case css.indexOf("px") !== -1:
        case !isNaN(parseFloat(css)):
            px = parseFloat(css.split("px")[0]);
            break;
        case css === "xx-small":
            px = 9;
            break;
        case css === "x-small":
            px = 10;
            break;
        case css === "medium":
            px = 16;
            break;
        case css === "large":
            px = 18;
            break;
        case css === "x-large":
            px = 24;
            break;
        case css === "xx-large":
            px = 32;
            break;
        case css === "small":
            px = 13;
            break;
        default:
            px = 13;
            break;
    }

    // 1 px = 3/4     pt
    // 1 pt = 1/72    in
    // 1 in = 25.4    mm
    // =================
    // 1 px = 25.4/96 mm
    return mmToTenths(scaling40, px * mmPerIn / 96);
}

/**
 * Converts a length in tenths of a stave length to mm.
 * 
 * @param scaling40 the standard stave height
 */
export function tenthsToMM(scaling40: number, tenths: number) {
    return scaling40 * tenths / 40;
}
