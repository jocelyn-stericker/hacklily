/**
 * @license
 * This file is part of Makelily.
 * Copyright (C) 2017 - present Jocelyn Stericker <jocelyn@nettek.ca>
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301  USA
 */
import { buildClef, buildKey, buildTime, } from "musicxml-interfaces/builders";
export function parseClef(clefLy) {
    var sign = "G";
    var line = 2;
    var clefOctaveChange;
    if (clefLy.indexOf("treble") > -1) {
        sign = "G";
        line = 2;
    }
    else if (clefLy.indexOf("bass") > -1) {
        sign = "F";
        line = 4;
    }
    else if (clefLy.indexOf("alto") > -1) {
        sign = "C";
        line = 3;
    }
    else if (clefLy.indexOf("tenor") > -1) {
        sign = "C";
        line = 4;
    }
    else if (clefLy.indexOf("tab") > -1) {
        sign = "TAB";
        line = 5;
    }
    else if (clefLy.indexOf("percussion") > -1) {
        sign = "percussion";
        line = 3;
    }
    if (clefLy.match(/\^.*8/)) {
        clefOctaveChange = "1";
    }
    if (clefLy.match(/\^.*15/)) {
        clefOctaveChange = "2";
    }
    if (clefLy.match(/_.*8/)) {
        clefOctaveChange = "-1";
    }
    if (clefLy.match(/_.*15/)) {
        clefOctaveChange = "-2";
    }
    return buildClef(function (clef) {
        return clef
            .clefOctaveChange(clefOctaveChange)
            .line(line)
            .sign(sign);
    });
}
var roots = [
    "ces",
    "ges",
    "des",
    "aes",
    "ees",
    "bes",
    "f",
    "c",
    "g",
    "d",
    "a",
    "e",
    "b",
    "fis",
    "cis",
    "gis",
    "dis",
    "ais",
];
export function parseKeySig(keyLy) {
    var root = keyLy
        .toLowerCase()
        .trim()
        .split(" ")[0];
    var rootIdx = roots.indexOf(root);
    var fifths = 0;
    var mode = "major";
    if (rootIdx !== -1 && keyLy.indexOf("\\minor") !== -1) {
        mode = "minor";
        fifths = rootIdx - 10;
    }
    else if (rootIdx !== -1 && keyLy.indexOf("\\major") !== -1) {
        mode = "major";
        fifths = rootIdx - 7;
    }
    return buildKey(function (key) { return key.fifths(fifths).mode(mode); });
}
export function parseTime(timeLy) {
    var beatTypes = [4];
    var beats = ["4"];
    var match = timeLy.match(/(\d+)\/(\d+)/);
    if (match && match.length > 1 && match[1].length && match[2].length) {
        beats = [match[1]];
        beatTypes = [parseInt(match[2], 10)];
    }
    return buildTime(function (time) {
        return time.beatTypes(beatTypes).beats(beats);
    });
}
//# sourceMappingURL=parseLy.js.map
