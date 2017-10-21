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

enum Type {
    START_OF_LAYOUT_ELEMENTS = 0,
    Print = 10,
    Grouping = 30,
    FiguredBass = 40,
    END_OF_LAYOUT_ELEMENTS = 99,

    START_OF_STAFF_ELEMENTS = 100,
    Attributes = 110,
    Sound = 120,
    Direction = 130,
    Harmony = 140,
    Proxy = 150, // Does not implement a MusicXML API
    Spacer = 160, // Does not implement a MusicXML API
    END_OF_STAFF_ELEMENTS = 199,

    START_OF_VOICE_ELEMENTS = 200,
    Chord = 220, // Implements Note[]
    END_OF_VOICE_ELEMENTS = 299,

    VisualCursor = 398,
    Barline = 399, // Also deals with warning attributes

    Unknown = 1000
};

// Notes and chords are treated as the same type.
(Type as any)["Note"] = Type.Chord;

export default Type;
