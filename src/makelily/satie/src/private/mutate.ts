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

import * as invariant from "invariant";
import {last, isEqual} from "lodash";
import {IAny,
    IObjectReplace, IObjectDelete, IObjectInsert,
    IListReplace, IListDelete, IListInsert,
    OTPath} from "musicxml-interfaces/operations";

import {cloneObject} from "../private/util";

function expectEqualish(a: any, b: any) {
    a = cloneObject(a);
    b = cloneObject(b);
    invariant(isEqual(a, b), `Cannot perform operation since ${JSON.stringify(a, null, 2)} != ${JSON.stringify(b, null, 2)}`);
}

export function parentExists(obj: any, p: OTPath): boolean {
    for (let i = 0; i < p.length - 1; ++i) {
        obj = obj[p[i]];
        if (!obj) {
            return false;
        }
    }
    return true;
}

export function findParent(obj: any, p: OTPath): any {
    for (let i = 0; i < p.length - 1; ++i) {
        obj = obj[p[i]];
        invariant(obj, `Invalid path: ${p.join(", ")}`);
    }
    return obj;
}

export function set(obj: any, op: IObjectInsert<any>) {
    let parent = findParent(obj, op.p);
    let key = last(op.p);
    parent[key] = op.oi;
    // STOPSHIP: this could cause problems during collaboration/undo
    expectEqualish(parent[key], op.oi);
}

export function insertToList(obj: any, op: IListInsert<any>) {
    let parent = findParent(obj, op.p);
    let key = last(op.p);
    invariant(key <= parent.length, "Invalid operation");
    invariant(key >= 0, "Invalid operation");
    parent.splice(key, 0, obj);
}

export function replace(obj: any, op: IObjectReplace<any>) {
    let parent = findParent(obj, op.p);
    let key = last(op.p);
    // STOPSHIP: this could cause problems during collaboration/undo
    expectEqualish(parent[key], op.od);
    parent[key] = op.oi;
}

export function replaceInList(obj: any, op: IListReplace<any>) {
    let parent = findParent(obj, op.p);
    let key = last(op.p);
    // STOPSHIP: this could cause problems during collaboration/undo
    expectEqualish(parent[key], op.ld);
    parent[key] = op.li;
}

export function remove(obj: any, op: IObjectDelete<any>) {
    let parent = findParent(obj, op.p);
    let key = last(op.p);
    // STOPSHIP: this could cause problems during collaboration/undo
    expectEqualish(parent[key], op.od);

    // We do not actually delete the object. This:
    //   - is more efficient
    //   - supports chained objects (prototypical inheritance) 
    //   - supports getters/setters.
    parent[key] = undefined;
}

export function removeFromList(obj: any, op: IListDelete<any>) {
    let parent = findParent(obj, op.p);
    let key = last(op.p);
    invariant(key < parent.length, "Invalid operation");
    invariant(key >= 0, "Invalid operation");
    // STOPSHIP: this could cause problems during collaboration/undo
    expectEqualish(parent[key], op.ld);
    parent.splice(key, 1);
}

export function mutate(obj: any, op: IAny) {
    if ("od" in op && "oi" in op) {
        replace(obj, op as IObjectReplace<any>);
    } else if ("od" in op) {
        remove(obj, op as IObjectReplace<any>);
    } else if ("oi" in op) {
        set(obj, op as IObjectInsert<any>);
    } else if ("ld" in op && "li" in op) {
        replaceInList(obj, op as IListReplace<any>);
    } else if ("ld" in op) {
        removeFromList(obj, op as IListDelete<any>);
    } else if ("li" in op) {
        insertToList(obj, op as IListInsert<any>);
    } else {
        invariant(false, "Unsupported operation");
    }
}
