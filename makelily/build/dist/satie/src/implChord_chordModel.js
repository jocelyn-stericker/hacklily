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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var document_1 = require("./document");
var implChord_chordImpl_1 = __importDefault(require("./implChord_chordImpl"));
/**
 * Registers Chord in the factory structure passed in.
 */
function ChordModel(constructors) {
    constructors["Note"] = document_1.Type.Chord;
    constructors[document_1.Type.Chord] = implChord_chordImpl_1.default;
}
exports.default = ChordModel;
//# sourceMappingURL=implChord_chordModel.js.map