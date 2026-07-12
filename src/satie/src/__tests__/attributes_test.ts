// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

/**
 * @file part of Satie test suite
 */

import type { Attributes } from "#/musicxml-interfaces";

import type { ISegment, IModel } from "../document";
import { Type } from "../document";
import Factory from "../engine_factory";
import type { IAttributesLayout } from "../implAttributes_attributesModel";
import AttributesModel from "../implAttributes_attributesModel";
import type { ValidationCursor, LayoutCursor } from "../private_cursor";

export function makeCursor(
  factory: Factory,
  models: ISegment,
): ValidationCursor {
  models.part = "P1";
  const v: ValidationCursor = {
    const: () => v,
    document: {
      __fakeDocument: true,
    } as any,
    fixup: () => null,
    dangerouslyPatchWithoutValidation: () => null,
    patch: () => null,
    advance: null,

    segmentInstance: models,
    segmentPosition: 0,

    staffAttributes: <any>{
      divisions: 60,
      clef: {
        sign: "G",
        clefOctaveChange: "0",
        line: 2,
      },
      time: {
        beats: ["4"],
        beatTypes: [4],
        senzaMisura: null,
      },
    },
    staffAccidentals: {},
    staffIdx: 0,
    measureInstance: {
      uuid: 100,
      nonControlling: false,
      idx: 0,
      number: "1",
      implicit: false,
      parts: {
        P1: {
          staves: [null, {}],
          voices: null,
        },
      },
    } as any,
    measureIsLast: true,
    print: null,
    header: <any>{
      partList: [
        {
          _class: "ScorePart",
          id: "P1",
        },
      ],
    },

    segmentDivision: 0,

    factory: factory,
    preview: false,
    singleLineMode: false,
  };
  return v;
}

function FakeChord(constructors: { [key: number]: any }) {
  constructors[Type.Chord] = function () {
    // pass
  };
}

describe("[attributes.ts]", function () {
  describe("AttributesModel", function () {
    const factory = new Factory([AttributesModel, FakeChord]);
    let attributes: Attributes & IModel;
    let segment: ISegment;
    it("can be created", function () {
      attributes = factory.create(Type.Attributes);
      expect(!!attributes).toBe(true);
      // Divisions is usually set by the engine
      attributes.divisions = 100;
      attributes.clefs = [];
      segment = [attributes] as any;

      const cursor = makeCursor(factory, segment);
      cursor.staffAttributes = <any>{};
      attributes.refresh(cursor);
    });
    it("lays out properly when at start of song", function () {
      const cursor = makeCursor(factory, segment);
      cursor.staffAttributes = {
        keySignatures: [],
        times: [],
        clefs: [],
        staffDetails: [],
      } as any;
      attributes.clefs = [{ sign: "G", line: 2, clefOctaveChange: null }];
      attributes.keySignatures = [{ fifths: 0, mode: "major" }];
      attributes.times = [{ beats: ["4"], beatTypes: [4] }];
      attributes.refresh(cursor);
      const lCursor: LayoutCursor = {
        // eslint-disable-next-line @typescript-eslint/no-misused-spread
        ...cursor,
        measureX: 0,
        lineShortest: Number.MAX_VALUE,
        lineBarOnLine: 0,
        lineTotalBarsOnLine: 1,
        lineIndex: 0,
        lineCount: 1,
        segmentX: 100,
        lineMaxPaddingTopByStaff: [],
        lineMaxPaddingBottomByStaff: [],
      };
      const layout = attributes.getLayout(lCursor) as IAttributesLayout;
      expect(!!layout.keySignature).toBe(true);
      expect(!!layout.time).toBe(true);
      expect(!!layout.clef).toBe(true);
      expect(layout.tsSpacing).toBeGreaterThan(0);
      expect(layout.clefSpacing).toBeGreaterThan(0);
      expect(layout.ksSpacing).toBeGreaterThan(0);

      expect(layout.x).toBeLessThan(lCursor.segmentX);
      const expectedChange =
        layout.clefSpacing + layout.tsSpacing + layout.ksSpacing;
      expect(lCursor.segmentX - layout.x).toEqual(expectedChange);
    });
  });
});
