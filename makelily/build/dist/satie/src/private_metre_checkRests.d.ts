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
export interface IOptions {
    dotsAllowed: boolean;
}
/**
 * $timeSignatureName is a string like "4/4" or "6/8".
 *
 * A $song is a string in a song where $barLength divisions make up a bar.
 * A full $song is made up of $barLength characters.
 * The string contains three kinds of characters.
 *  - 'r': The start of a beat
 *  - '_': The continuation of a beat
 *  - '.': A note
 *
 * See README.md for examples / tests.
 */
export default function checkRests(timeSignatureName: string, barLength: number, song: string, options: IOptions): string;
