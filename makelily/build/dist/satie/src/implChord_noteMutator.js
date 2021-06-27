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
import invariant from "invariant";
import { replace, remove, set, mutate } from "./private_mutate";
export default function noteMutator(note, op) {
    if (op.p.length > 2) {
        mutate(note, op);
        return;
    }
    if ("od" in op && "oi" in op) {
        if (op.p.length === 2 && op.p[0] === "noteType" && op.p[1] === "duration") {
            note.noteType = {
                duration: op.oi,
            };
        }
        else {
            replace(note, op);
        }
    }
    else if ("od" in op) {
        remove(note, op);
    }
    else if ("oi" in op) {
        invariant(!note[op.p[0]], "Object already set");
        set(note, op);
    }
    else if ("ld" in op || "li" in op) {
        mutate(note, op);
    }
    else {
        throw new Error("Unknown operation");
    }
}
//# sourceMappingURL=implChord_noteMutator.js.map