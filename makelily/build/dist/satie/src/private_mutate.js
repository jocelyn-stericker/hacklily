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
import invariant from "invariant";
import { last, isEqual } from "lodash";
import { cloneObject } from "./private_util";
function expectEqualish(a, b) {
    a = cloneObject(a);
    b = cloneObject(b);
    if (!isEqual(a, b)) {
        console.warn("Invalid operation since " + JSON.stringify(a, null, 2) + " != " + JSON.stringify(b, null, 2) + ". Doing it anyway.");
    }
}
export function parentExists(obj, p) {
    for (var i = 0; i < p.length - 1; ++i) {
        obj = obj[p[i]];
        if (!obj) {
            return false;
        }
    }
    return true;
}
export function findParent(obj, p) {
    for (var i = 0; i < p.length - 1; ++i) {
        obj = obj[p[i]];
        invariant(obj, "Invalid path: " + p.join(", "));
    }
    return obj;
}
export function set(obj, op) {
    var parent = findParent(obj, op.p);
    var key = last(op.p);
    parent[key] = op.oi;
    // STOPSHIP: this could cause problems during collaboration/undo
    expectEqualish(parent[key], op.oi);
}
export function insertToList(obj, op) {
    var parent = findParent(obj, op.p);
    var key = last(op.p);
    invariant(key >= 0, "Invalid operation");
    parent.splice(key, 0, op.li);
}
export function replace(obj, op) {
    var parent = findParent(obj, op.p);
    var key = last(op.p);
    // STOPSHIP: this could cause problems during collaboration/undo
    expectEqualish(parent[key], op.od);
    parent[key] = op.oi;
}
export function replaceInList(obj, op) {
    var parent = findParent(obj, op.p);
    var key = last(op.p);
    // STOPSHIP: this could cause problems during collaboration/undo
    expectEqualish(parent[key], op.ld);
    parent[key] = op.li;
}
export function remove(obj, op) {
    var parent = findParent(obj, op.p);
    var key = last(op.p);
    // STOPSHIP: this could cause problems during collaboration/undo
    expectEqualish(parent[key], op.od);
    // We do not actually delete the object. This:
    //   - is more efficient
    //   - supports chained objects (prototypical inheritance)
    //   - supports getters/setters.
    parent[key] = undefined;
}
export function removeFromList(obj, op) {
    var parent = findParent(obj, op.p);
    var key = last(op.p);
    invariant(key < parent.length, "Invalid operation");
    invariant(key >= 0, "Invalid operation");
    // STOPSHIP: this could cause problems during collaboration/undo
    expectEqualish(parent[key], op.ld);
    parent.splice(key, 1);
}
export function mutate(obj, op) {
    if ("od" in op && "oi" in op) {
        replace(obj, op);
    }
    else if ("od" in op) {
        remove(obj, op);
    }
    else if ("oi" in op) {
        set(obj, op);
    }
    else if ("ld" in op && "li" in op) {
        replaceInList(obj, op);
    }
    else if ("ld" in op) {
        removeFromList(obj, op);
    }
    else if ("li" in op) {
        insertToList(obj, op);
    }
    else {
        throw new Error("Unsupported operation");
    }
}
//# sourceMappingURL=private_mutate.js.map