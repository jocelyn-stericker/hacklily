/**
 * The Ripieno editor. 
 * (C) Josh Netterfield <joshua@nettek.ca> 2014-2015.
 */

import invariant = require("invariant");
import {last, isEqual} from 'lodash';

import {IOTObjectReplace, OTPath} from "../ot";

export function get(obj: any, p: OTPath) {
    for (let i = 0; i < p.length; ++i) {
        invariant(obj, `Invalid path: ${p.join(', ')}`);
        obj = obj[p[i]];
    }
    return obj;
}

export function set(obj: any, p: OTPath, val: any) {
    for (let i = 0; i < p.length - 1; ++i) {
        obj = obj[p[i]];
        invariant(obj, `Invalid path: ${p.join(', ')}`);
    }
    obj[last(p)] = val;
}

export function replace(obj: any, op: IOTObjectReplace<any>) {
    let current = get(obj, op.p);
    invariant(isEqual(current, op.od), `Invalid replace: ${op.od} does not deep equal ${current}`);
    set(obj, op.p, op.oi);
}