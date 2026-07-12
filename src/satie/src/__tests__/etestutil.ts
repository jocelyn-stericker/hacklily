// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

/**
 * @file part of Satie test suite
 */

import type { ISegment, IModel, ILayout } from "../document";
import { Type } from "../document";
import type { ValidationCursor, LayoutCursor } from "../private_cursor";
import type { IFactory } from "../private_factory";

export const fakeFactory: IFactory = {
  create: (_modelType: Type): IModel => {
    expect(false).toEqual("not reached");
    return null;
  },
  modelHasType: (model: IModel, modelType: Type): boolean => {
    if (model.divCount === 0) {
      return modelType === Type.Attributes;
    } else if ("length" in model) {
      return modelType === Type.Chord;
    }
    return modelType === Type.Spacer;
  },
  search: (models: IModel[], idx: number, modelType: Type): IModel[] => {
    return fakeFactory.modelHasType(models[idx], modelType)
      ? [models[idx]]
      : [];
  },
  fromSpec: (_spec: any): IModel => {
    throw new Error("Not implemented");
  },
} as any;

export function createFakeStaffSegment(
  divisions1: number,
  divisions2: number,
  idx: number,
): ISegment {
  const a: ISegment = <any>(<IModel[]>[
    {
      divCount: divisions1,
      staffIdx: 1,

      refresh: function (_cursor: ValidationCursor) {
        // pass
      },
      getLayout: function (cursor: LayoutCursor): ILayout {
        const width = 10;
        cursor.segmentX += width;
        return {
          boundingBoxes: [],
          division: cursor.segmentDivision,
          x: cursor.segmentX - width,
          model: this,
          renderClass: Type.Attributes,
        };
      },
    },
    {
      divCount: divisions2,
      staffIdx: 1,

      refresh: function (_cursor: ValidationCursor) {
        // pass
      },
      getLayout: function (cursor: LayoutCursor): ILayout {
        const width = 10;
        cursor.segmentX += width;
        return {
          boundingBoxes: [],
          division: cursor.segmentDivision,
          x: cursor.segmentX - width,
          model: this,
          renderClass: Type.Attributes,
        };
      },
    },
  ]);
  a.owner = idx;
  a.part = "P1";
  a.divisions = divisions1 + divisions2;
  a.ownerType = "staff";
  return a;
}

export function createFakeVoiceSegment(
  divisions1: number,
  divisions2: number,
  idx: number,
): ISegment {
  const a: ISegment = <any>(<(IModel & { length: number; 0: any })[]>[
    {
      divCount: divisions1,
      staffIdx: 1,
      length: 1,
      [0]: {
        pitch: {
          step: "E",
          octave: 4,
        },
        noteType: {
          duration: 8,
        },
        ties: [{}],
      },

      refresh: function (_cursor: ValidationCursor) {
        // pass
      },

      getLayout: function (cursor: LayoutCursor): ILayout {
        const width = divisions1 * 10;
        cursor.segmentX += width;
        return {
          boundingBoxes: [],
          division: cursor.segmentDivision,
          x: cursor.segmentX - width,
          expandPolicy: "after",
          model: this,
          renderClass: Type.Chord,
        };
      },
    },
    {
      divCount: divisions2,
      staffIdx: 1,
      length: 1,
      [0]: {
        pitch: {
          step: "E",
          octave: 4,
        },
        noteType: {
          duration: 8,
        },
        ties: [{}],
      },

      refresh: function (_cursor: ValidationCursor) {
        // pass
      },

      getLayout: function (cursor: LayoutCursor): ILayout {
        const width = divisions2 * 10;
        cursor.segmentX += width;
        return {
          boundingBoxes: [],
          division: cursor.segmentDivision,
          x: cursor.segmentX - width,
          expandPolicy: "after",
          model: this,
          renderClass: Type.Chord,
        };
      },
    },
  ]);
  a.owner = idx;
  a.part = "P1";
  a.ownerType = "voice";
  a.divisions = divisions1 + divisions2;
  return a;
}

export function createFakeLayout(
  idx: number,
  offset: number,
  _max: boolean,
): ILayout {
  return {
    model: <any>{},
    x: idx * 100 + (Math.log(1 + offset) / Math.log(2)) * 10,
    division: idx * 4 + offset,
    boundingBoxes: [],
    renderClass: Type.Attributes,
  };
}
