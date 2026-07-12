// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

import invariant from "invariant";
import { last, isEqual } from "lodash";

import type {
  IAny,
  IObjectReplace,
  IObjectDelete,
  IObjectInsert,
  IListReplace,
  IListDelete,
  IListInsert,
  OTPath,
} from "#/musicxml-interfaces/operations";

import { cloneObject } from "./private_util";

function expectEqualish(a: any, b: any) {
  a = cloneObject(a);
  b = cloneObject(b);
  if (!isEqual(a, b)) {
    console.warn(
      `Invalid operation since ${JSON.stringify(
        a,
        null,
        2,
      )} != ${JSON.stringify(b, null, 2)}. Doing it anyway.`,
    );
  }
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
  const parent = findParent(obj, op.p);
  const key = last(op.p);
  parent[key] = op.oi;
  // STOPSHIP: this could cause problems during collaboration/undo
  expectEqualish(parent[key], op.oi);
}

export function insertToList(obj: any, op: IListInsert<any>) {
  const parent = findParent(obj, op.p);
  const key = last(op.p);
  invariant(Number(key) >= 0, "Invalid operation");
  parent.splice(key, 0, op.li);
}

export function replace(obj: any, op: IObjectReplace<any>) {
  const parent = findParent(obj, op.p);
  const key = last(op.p);
  // STOPSHIP: this could cause problems during collaboration/undo
  expectEqualish(parent[key], op.od);
  parent[key] = op.oi;
}

export function replaceInList(obj: any, op: IListReplace<any>) {
  const parent = findParent(obj, op.p);
  const key = last(op.p);
  // STOPSHIP: this could cause problems during collaboration/undo
  expectEqualish(parent[key], op.ld);
  parent[key] = op.li;
}

export function remove(obj: any, op: IObjectDelete<any>) {
  const parent = findParent(obj, op.p);
  const key = last(op.p);
  // STOPSHIP: this could cause problems during collaboration/undo
  expectEqualish(parent[key], op.od);

  // We do not actually delete the object. This:
  //   - is more efficient
  //   - supports chained objects (prototypical inheritance)
  //   - supports getters/setters.
  parent[key] = undefined;
}

export function removeFromList(obj: any, op: IListDelete<any>) {
  const parent = findParent(obj, op.p);
  const key = last(op.p);
  invariant(key < parent.length, "Invalid operation");
  invariant(Number(key) >= 0, "Invalid operation");
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
    throw new Error("Unsupported operation");
  }
}
