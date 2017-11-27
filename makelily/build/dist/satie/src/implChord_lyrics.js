"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
var musicxml_interfaces_1 = require("musicxml-interfaces");
var lodash_1 = require("lodash");
var private_renderUtil_1 = require("./private_renderUtil");
var private_fontManager_1 = require("./private_fontManager");
exports.DEFAULT_LYRIC_SIZE = "22";
exports.DEFAULT_FONT = "Alegreya";
exports.SYLLABIC_SIZE = 20;
function getChordLyricWidth(chord, scale40) {
    return lodash_1.reduce(chord, function (maxWidth, note) {
        return Math.max(maxWidth, getNoteLyricWidth(note, scale40));
    }, 0);
}
exports.getChordLyricWidth = getChordLyricWidth;
function getNoteLyricWidth(note, scale40) {
    return lodash_1.reduce(note.lyrics, function (maxWidth, lyric) {
        return Math.max(maxWidth, getLyricWidth(lyric, scale40));
    }, 0);
}
exports.getNoteLyricWidth = getNoteLyricWidth;
function getLyricWidth(lyric, scale40) {
    return lodash_1.reduce(lyric.lyricParts, function (partWidth, lyricPart) {
        if (lyricPart._class === "Syllabic") {
            return partWidth + exports.SYLLABIC_SIZE;
        }
        else if (lyricPart._class === "Text") {
            var text = lyricPart;
            return partWidth + private_fontManager_1.getTextBB(text.fontFamily || exports.DEFAULT_FONT, text.data, private_renderUtil_1.cssSizeToTenths(scale40, text.fontSize || exports.DEFAULT_LYRIC_SIZE), text.fontWeight === musicxml_interfaces_1.NormalBold.Bold ? "bold" : null).right;
        }
        return 0;
    }, 0);
}
exports.getLyricWidth = getLyricWidth;
//# sourceMappingURL=implChord_lyrics.js.map