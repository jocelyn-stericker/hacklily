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
var lodash_1 = require("lodash");
var private_util_1 = require("./private_util");
function expectEqualish(a, b) {
    a = private_util_1.cloneObject(a);
    b = private_util_1.cloneObject(b);
    if (!lodash_1.isEqual(a, b)) {
        console.warn("Invalid operation since " + JSON.stringify(a, null, 2) + " != " + JSON.stringify(b, null, 2) + ". Doing it anyway.");
    }
}
function parentExists(obj, p) {
    for (var i = 0; i < p.length - 1; ++i) {
        obj = obj[p[i]];
        if (!obj) {
            return false;
        }
    }
    return true;
}
exports.parentExists = parentExists;
function findParent(obj, p) {
    for (var i = 0; i < p.length - 1; ++i) {
        obj = obj[p[i]];
        invariant_1.default(obj, "Invalid path: " + p.join(", "));
    }
    return obj;
}
exports.findParent = findParent;
function set(obj, op) {
    var parent = findParent(obj, op.p);
    var key = lodash_1.last(op.p);
    parent[key] = op.oi;
    // STOPSHIP: this could cause problems during collaboration/undo
    expectEqualish(parent[key], op.oi);
}
exports.set = set;
function insertToList(obj, op) {
    var parent = findParent(obj, op.p);
    var key = lodash_1.last(op.p);
    invariant_1.default(key >= 0, "Invalid operation");
    parent.splice(key, 0, op.li);
}
exports.insertToList = insertToList;
function replace(obj, op) {
    var parent = findParent(obj, op.p);
    var key = lodash_1.last(op.p);
    // STOPSHIP: this could cause problems during collaboration/undo
    expectEqualish(parent[key], op.od);
    parent[key] = op.oi;
}
exports.replace = replace;
function replaceInList(obj, op) {
    var parent = findParent(obj, op.p);
    var key = lodash_1.last(op.p);
    // STOPSHIP: this could cause problems during collaboration/undo
    expectEqualish(parent[key], op.ld);
    parent[key] = op.li;
}
exports.replaceInList = replaceInList;
function remove(obj, op) {
    var parent = findParent(obj, op.p);
    var key = lodash_1.last(op.p);
    // STOPSHIP: this could cause problems during collaboration/undo
    expectEqualish(parent[key], op.od);
    // We do not actually delete the object. This:
    //   - is more efficient
    //   - supports chained objects (prototypical inheritance)
    //   - supports getters/setters.
    parent[key] = undefined;
}
exports.remove = remove;
function removeFromList(obj, op) {
    var parent = findParent(obj, op.p);
    var key = lodash_1.last(op.p);
    invariant_1.default(key < parent.length, "Invalid operation");
    invariant_1.default(key >= 0, "Invalid operation");
    // STOPSHIP: this could cause problems during collaboration/undo
    expectEqualish(parent[key], op.ld);
    parent.splice(key, 1);
}
exports.removeFromList = removeFromList;
function mutate(obj, op) {
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
exports.mutate = mutate;
//# sourceMappingURL=private_mutate.js.map