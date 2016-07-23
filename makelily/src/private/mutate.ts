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
import {last, union, isEqual, isObject, isArray} from "lodash";
import {IAny, IObjectReplace, IObjectDelete, IObjectInsert, OTPath} from "musicxml-interfaces/operations";

export function get(obj: any, p: OTPath) {
    for (let i = 0; i < p.length; ++i) {
        invariant(obj, `Invalid path: ${p.join(", ")}`);
        obj = obj[p[i]];
    }
    return obj;
}

export function findParent(obj: any, p: OTPath): any {
    for (let i = 0; i < p.length - 1; ++i) {
        obj = obj[p[i]];
        invariant(obj, `Invalid path: ${p.join(", ")}`);
    }
    return obj;
}

export function allKeys(a: any): string[] {
    let keys: string[] = [];
    do {
        keys = keys.concat(a.__proto__);
        a = a.__proto__;
    } while(a);
    return keys;
}

export function expectEqualish(a: any, b: any, op: IAny) {
    if (isArray(a) || isArray(b) || !isObject(a) || !isObject(b)) {
        if (!isEqual(a, b)) {
            throw new Error(`a[] != b[] when evaluating ${JSON.stringify(op)}`);
        }
        return;
    }

    let aKeys = allKeys(a);
    let bKeys = allKeys(b);
    union(aKeys, bKeys).forEach(key => {
        if (!isEqual(a[key], b[key])) {
            throw new Error(`a.${key} != b.${key} when evaluating ${JSON.stringify(op)}`);
        }
    });
}

export function set(obj: any, op: IObjectInsert<any>) {
    let parent = findParent(obj, op.p);
    let key = last(op.p);
    parent[key] = op.oi;
    // STOPSHIP: this could cause problems during collaboration/undo
    // expectEqualish(parent[key], op.oi, op);
}

export function replace(obj: any, op: IObjectReplace<any>) {
    let parent = findParent(obj, op.p);
    let key = last(op.p);
    // STOPSHIP: this could cause problems during collaboration/undo
    // expectEqualish(parent[key], op.od, op);
    parent[key] = op.oi;
}

export function remove(obj: any, op: IObjectDelete<any>) {
    let parent = findParent(obj, op.p);
    let key = last(op.p);
    // STOPSHIP: this could cause problems during collaboration/undo
    // expectEqualish(parent[key], op.od, op);

    // We decide to not actually delete the object. This:
    //   - is more efficient
    //   - supports chained objects (prototypical inheritance) 
    //   - supports getters/setters.
    parent[key] = undefined;
}

export function mutate(obj: any, op: IAny) {
    if ("od" in op && "oi" in op) {
        replace(obj, op as IObjectReplace<any>);
    } else if ("od" in op) {
        remove(obj, op as IObjectReplace<any>);
    } else if ("oi" in op) {
        set(obj, op as IObjectInsert<any>);
    } else {
        invariant(false, "Unsupported operation");
    }
}

