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
import { Note, Lyric } from "musicxml-interfaces";
import { IChord } from "./private_chordUtil";
export declare const DEFAULT_LYRIC_SIZE = "22";
export declare const DEFAULT_FONT = "Alegreya";
export declare const SYLLABIC_SIZE = 20;
export declare function getChordLyricWidth(chord: IChord, scale40: number): number;
export declare function getNoteLyricWidth(note: Note, scale40: number): number;
export declare function getLyricWidth(lyric: Lyric, scale40: number): number;
