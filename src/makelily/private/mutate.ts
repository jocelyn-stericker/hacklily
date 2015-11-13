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

import invariant = require("invariant");
import {last, isEqual} from "lodash";
import {IObjectReplace, IObjectDelete, OTPath} from "musicxml-interfaces/operations";

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

export function set(obj: any, p: OTPath, val: any) {
    findParent(obj, p)[last(p)] = val;
}

export function delete_(obj: any, p: OTPath) {
    delete findParent(obj, p)[last(p)];
}

export function replace(obj: any, op: IObjectReplace<any>) {
    let current = get(obj, op.p);
    invariant(isEqual(current, op.od), `Invalid replace: ${op.od} does not deep equal ${current}`);
    set(obj, op.p, op.oi);
}

export function remove(obj: any, op: IObjectDelete<any>) {
   delete_(obj, op.p);
}

