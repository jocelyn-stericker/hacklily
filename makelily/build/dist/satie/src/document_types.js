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
var Type;
(function (Type) {
    Type[Type["START_OF_LAYOUT_ELEMENTS"] = 0] = "START_OF_LAYOUT_ELEMENTS";
    Type[Type["Print"] = 10] = "Print";
    Type[Type["Grouping"] = 30] = "Grouping";
    Type[Type["FiguredBass"] = 40] = "FiguredBass";
    Type[Type["END_OF_LAYOUT_ELEMENTS"] = 99] = "END_OF_LAYOUT_ELEMENTS";
    Type[Type["START_OF_STAFF_ELEMENTS"] = 100] = "START_OF_STAFF_ELEMENTS";
    Type[Type["Attributes"] = 110] = "Attributes";
    Type[Type["Sound"] = 120] = "Sound";
    Type[Type["Direction"] = 130] = "Direction";
    Type[Type["Harmony"] = 140] = "Harmony";
    Type[Type["Proxy"] = 150] = "Proxy";
    Type[Type["Spacer"] = 160] = "Spacer";
    Type[Type["END_OF_STAFF_ELEMENTS"] = 199] = "END_OF_STAFF_ELEMENTS";
    Type[Type["START_OF_VOICE_ELEMENTS"] = 200] = "START_OF_VOICE_ELEMENTS";
    Type[Type["Chord"] = 220] = "Chord";
    Type[Type["END_OF_VOICE_ELEMENTS"] = 299] = "END_OF_VOICE_ELEMENTS";
    Type[Type["VisualCursor"] = 398] = "VisualCursor";
    Type[Type["Barline"] = 399] = "Barline";
})(Type || (Type = {}));
// Notes and chords are treated as the same type.
Type["Note"] = Type.Chord;
export default Type;
//# sourceMappingURL=document_types.js.map