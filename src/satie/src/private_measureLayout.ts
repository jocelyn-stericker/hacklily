// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

import { map, mapValues } from "lodash";

import type { Print } from "#/musicxml-interfaces";

import type { ILayout } from "./document";
import { detach as detachLayout } from "./document";
import type { IAttributesSnapshot } from "./private_attributesSnapshot";

export interface IMeasureLayout {
  attributes: { [part: string]: IAttributesSnapshot[] };
  print: Print;
  elements: ILayout[][];
  width: number;
  maxDivisions: number;
  uuid: number;
  originX: number;
  /**
   * Topmost (i.e., lowest) y-coordinates of each staff in tenths. One part may have more
   * than one staff.
   */
  originY: { [part: string]: number[] };
  /**
   * Positive integer in tenths. Required space above each staff beyond default 15 tenths,
   * indexed by staff index.
   */
  paddingTop: number[];
  /**
   * Postivie integer in tenths. Required space below each staff beyond default 15 tenths,
   * indexed by staff index.
   */
  paddingBottom: number[];

  getVersion: () => number;
}

export function detach(layout: IMeasureLayout) {
  const clone: IMeasureLayout = {
    attributes: layout.attributes,
    print: layout.print,
    elements: map(layout.elements, (v) => map(v, detachLayout)),
    width: layout.width,
    maxDivisions: layout.maxDivisions,
    originX: layout.originX,
    originY: mapValues(layout.originY, (origins) => origins.slice()),
    paddingTop: layout.paddingTop.slice(),
    paddingBottom: layout.paddingBottom.slice(),
    getVersion: layout.getVersion,
    uuid: layout.uuid,
  };
  return clone;
}
