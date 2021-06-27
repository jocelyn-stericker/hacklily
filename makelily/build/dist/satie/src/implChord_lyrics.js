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
import { NormalBold } from "musicxml-interfaces";
import { reduce } from "lodash";
import { cssSizeToTenths } from "./private_renderUtil";
import { getTextBB } from "./private_fontManager";
export var DEFAULT_LYRIC_SIZE = "22";
export var DEFAULT_FONT = "Alegreya";
export var SYLLABIC_SIZE = 20;
export function getChordLyricWidth(chord, scale40) {
    return reduce(chord, function (maxWidth, note) { return Math.max(maxWidth, getNoteLyricWidth(note, scale40)); }, 0);
}
export function getNoteLyricWidth(note, scale40) {
    return reduce(note.lyrics, function (maxWidth, lyric) { return Math.max(maxWidth, getLyricWidth(lyric, scale40)); }, 0);
}
export function getLyricWidth(lyric, scale40) {
    return reduce(lyric.lyricParts, function (partWidth, lyricPart) {
        if (lyricPart._class === "Syllabic") {
            return partWidth + SYLLABIC_SIZE;
        }
        else if (lyricPart._class === "Text") {
            var text = lyricPart;
            return (partWidth +
                getTextBB(text.fontFamily || DEFAULT_FONT, text.data, cssSizeToTenths(scale40, text.fontSize || DEFAULT_LYRIC_SIZE), text.fontWeight === NormalBold.Bold ? "bold" : null).right);
        }
        return 0;
    }, 0);
}
//# sourceMappingURL=implChord_lyrics.js.map