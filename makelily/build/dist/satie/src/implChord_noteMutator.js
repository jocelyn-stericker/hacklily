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
var invariant_1 = __importDefault(require("invariant"));
var private_mutate_1 = require("./private_mutate");
function noteMutator(note, op) {
    if (op.p.length > 2) {
        private_mutate_1.mutate(note, op);
        return;
    }
    if ("od" in op && "oi" in op) {
        if (op.p.length === 2 && op.p[0] === "noteType" && op.p[1] === "duration") {
            note.noteType = {
                duration: op.oi,
            };
        }
        else {
            private_mutate_1.replace(note, op);
        }
    }
    else if ("od" in op) {
        private_mutate_1.remove(note, op);
    }
    else if ("oi" in op) {
        invariant_1.default(!note[op.p[0]], "Object already set");
        private_mutate_1.set(note, op);
    }
    else if ("ld" in op || "li" in op) {
        private_mutate_1.mutate(note, op);
    }
    else {
        throw new Error("Unknown operation");
    }
}
exports.default = noteMutator;
//# sourceMappingURL=implChord_noteMutator.js.map