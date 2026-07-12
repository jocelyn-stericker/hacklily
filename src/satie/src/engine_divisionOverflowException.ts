// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

import type { IAny } from "#/musicxml-interfaces/operations";

import type { IMeasure, IMeasurePart, ISegment } from "./document";
import type { IAttributesSnapshot } from "./private_attributesSnapshot";
import { MAX_SAFE_INTEGER, cloneObject } from "./private_util";

function getSplit(segment: ISegment, maxDiv: number, isVoice: boolean): number {
  let divs = 0;
  let split = 0;
  do {
    divs += segment[split].divCount || 0;
    if (divs <= maxDiv || !isVoice) {
      ++split;
    }
  } while (divs <= maxDiv && segment[split]);
  return split;
}

export default class DivisionOverflowException {
  maxDiv: number;
  oldParts: {
    [id: string]: IMeasurePart;
  };
  newParts: {
    [id: string]: IMeasurePart;
  } = {};
  measure: IMeasure;
  attributes: IAttributesSnapshot;
  message: string;
  stack: string;

  constructor(
    maxDiv: number,
    measure: IMeasure,
    attributes: IAttributesSnapshot,
  ) {
    this.measure = measure;
    this.message =
      "DivisionOverflowException: max division should be " +
      `${maxDiv} in measure ${this.measure.idx}`;
    this.stack = new Error().stack;
    this.maxDiv = maxDiv;
    this.oldParts = {
      P1: {
        voices: measure.parts["P1"].voices.map((segment) => {
          if (!segment) {
            return null;
          }
          const split = getSplit(segment, maxDiv, true);
          const ov = <any>segment.slice(0, split);
          return ov;
        }),
        staves: measure.parts["P1"].staves.map((segment) => {
          if (!segment) {
            return null;
          }
          const split = getSplit(segment, maxDiv, false);
          const os = <any>segment.slice(0, split);

          return os.filter((item: any) => item._class !== "Barline");
        }),
      },
    };
    this.newParts = {
      P1: {
        voices: measure.parts["P1"].voices.map((segment) => {
          if (!segment) {
            return null;
          }
          const split = getSplit(segment, maxDiv, true);
          const ov = <any>segment.slice(split);
          return ov;
        }),
        staves: measure.parts["P1"].staves.map((segment) => {
          if (!segment) {
            return null;
          }
          const split = getSplit(segment, maxDiv, false);
          const os = <any>segment.slice(split);
          return os;
        }),
      },
    };
    this.attributes = attributes;
  }

  getOperations(): IAny[] {
    return cloneObject([
      {
        ld: this.measure,
        li: {
          uuid: this.measure.uuid,
          parts: this.oldParts,
        },
        p: ["measures", this.measure.idx],
      },
      {
        li: {
          uuid: Math.floor(Math.random() * MAX_SAFE_INTEGER),
          parts: this.newParts,
        },
        p: ["measures", this.measure.idx + 1],
      },
    ]);
  }
}
