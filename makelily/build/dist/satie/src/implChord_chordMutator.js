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
var invariant = require("invariant");
var lodash_1 = require("lodash");
var musicxml_interfaces_1 = require("musicxml-interfaces");
var private_mutate_1 = require("./private_mutate");
var implChord_noteImpl_1 = require("./implChord_noteImpl");
var implChord_noteMutator_1 = require("./implChord_noteMutator");
function chordMutator(chord, op) {
    var path = op.p;
    if (op.p[0] === "notes") {
        if (path.length === 2) {
            var idx = path[1];
            invariant(!isNaN(idx), "Expected path index within chord to be a number");
            if ("li" in op && "ld" in op) {
                var replacement = op;
                invariant(musicxml_interfaces_1.serializeNote(replacement.ld) === musicxml_interfaces_1.serializeNote(chord[idx]), "Cannot remove mismatching item from %s.", path.join(" "));
                chord.splice(idx, 1, new implChord_noteImpl_1.default(chord, idx, replacement.li));
            }
            else if ("li" in op) {
                var insertion = op;
                chord.splice(idx, 0, new implChord_noteImpl_1.default(chord, idx, insertion.li));
            }
            else if ("ld" in op) {
                var deletion = op;
                invariant(musicxml_interfaces_1.serializeNote(deletion.ld) === musicxml_interfaces_1.serializeNote(chord[idx]), "Cannot remove mismatching item from %s.", path.join(" "));
                chord.splice(idx, 1);
            }
            else {
                throw new Error("Unsupported operation");
            }
            chord._init = false;
        }
        else {
            var note = chord[parseInt(String(op.p[1]), 10)];
            invariant(Boolean(note), "Invalid operation path for chord. No such note " + op.p[1]);
            var localOp = lodash_1.cloneDeep(op);
            localOp.p = path.slice(2);
            implChord_noteMutator_1.default(note, localOp);
            chord._init = false;
        }
    }
    else if (op.p[0] === "count") {
        if ("od" in op && "oi" in op) {
            private_mutate_1.replace(chord, op);
        }
        else if ("od" in op) {
            private_mutate_1.remove(chord, op);
        }
        else {
            throw new Error("Unsupported operation");
        }
    }
    else if (op.p[0] === "divCount") {
        chord.divCount = op.oi;
    }
    else {
        throw new Error("Invalid/unimplemented operation path for chord: " + op.p[0]);
    }
}
exports.default = chordMutator;
//# sourceMappingURL=implChord_chordMutator.js.map