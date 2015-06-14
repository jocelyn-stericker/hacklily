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

import Engine = require("../engine");
import FontManager = require("../fontManager");
import MusicXML = require("musicxml-interfaces");
import _ = require("lodash");

export function getChordLyricWidth(chord: Engine.IChord, scale40: number) {
    return _.reduce(chord, (maxWidth, note) =>
        Math.max(maxWidth, getNoteLyricWidth(note, scale40)), 0);
}

export function getNoteLyricWidth(note: MusicXML.Note, scale40: number) {
    return _.reduce(note.lyrics, (maxWidth, lyric) =>
        Math.max(maxWidth, getLyricWidth(lyric, scale40)), 0);
}

export function getLyricWidth(lyric: MusicXML.Lyric, scale40: number) {
    return _.reduce(lyric.lyricParts, (partWidth, lyricPart) => {
        if (lyricPart._class === "Syllabic") {
            return partWidth + SYLLABIC_SIZE;
        } else if (lyricPart._class === "Text") {
            let text = <MusicXML.Text> lyricPart;
            return partWidth + FontManager.getTextBB(text.fontFamily || DEFAULT_FONT, text.data,
                Engine.RenderUtil.cssSizeToTenths(scale40, text.fontSize || DEFAULT_LYRIC_SIZE),
                text.fontWeight === MusicXML.NormalBold.Bold ? "bold" : null).right;
        }
        // FontManager.getTextBB(lyric.))
        return 0;
    }, 0);
}

export const DEFAULT_LYRIC_SIZE = "22";
export const DEFAULT_FONT = "Alegreya";
export const SYLLABIC_SIZE = 20;

