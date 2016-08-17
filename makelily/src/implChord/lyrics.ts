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

import {Note, Lyric, Text, NormalBold} from "musicxml-interfaces";
import {reduce} from "lodash";

import IChord from "../private/chord";
import {cssSizeToTenths} from "../private/renderUtil";
import {getTextBB} from "../private/fontManager";

export const DEFAULT_LYRIC_SIZE = "22";
export const DEFAULT_FONT = "Alegreya";
export const SYLLABIC_SIZE = 20;

export function getChordLyricWidth(chord: IChord, scale40: number) {
    return reduce(chord, (maxWidth, note) =>
        Math.max(maxWidth, getNoteLyricWidth(note, scale40)), 0);
}

export function getNoteLyricWidth(note: Note, scale40: number) {
    return reduce(note.lyrics, (maxWidth, lyric) =>
        Math.max(maxWidth, getLyricWidth(lyric, scale40)), 0);
}

export function getLyricWidth(lyric: Lyric, scale40: number) {
    return reduce(lyric.lyricParts, (partWidth, lyricPart) => {
        if (lyricPart._class === "Syllabic") {
            return partWidth + SYLLABIC_SIZE;
        } else if (lyricPart._class === "Text") {
            let text = <Text> lyricPart;
            return partWidth + getTextBB(text.fontFamily || DEFAULT_FONT, text.data,
                cssSizeToTenths(scale40, text.fontSize || DEFAULT_LYRIC_SIZE),
                text.fontWeight === NormalBold.Bold ? "bold" : null).right;
        }
        return 0;
    }, 0);
}
