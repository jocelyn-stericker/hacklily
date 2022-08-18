/**
 * This file is part of Satie music engraver <https://github.com/emilyskidsister/satie>.
 * Copyright (C) Jocelyn Stericker <jocelyn@nettek.ca> 2015 - present.
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

/**
 * @file part of Satie test suite
 */

import {
  IRefreshMeasureOpts,
  refreshMeasure,
  layoutMeasure,
  RefreshMode,
} from "../engine_processors_measure";
import { getApproximateMeasureWidth } from "../engine_processors_layout";

import { Type } from "../document";
import { normalizeDivisionsInPlace } from "../engine_divisions";

import {
  createFakeVoiceSegment,
  createFakeStaffSegment,
  fakeFactory,
} from "./etestutil";

describe("[engine/measureProcessor.ts]", function () {
  describe("reduce", function () {
    it("can lay out multiple voices", function () {
      const segments = [
        createFakeStaffSegment(4, 4, 1), // 00001111
        createFakeVoiceSegment(2, 6, 1), // 00111111
        createFakeVoiceSegment(1, 7, 2), // 01111111
      ];
      segments[0].owner = 1;
      segments[0].part = "P1";
      segments[1].owner = 1;
      segments[1].part = "P1";
      segments[2].owner = 2;
      segments[2].part = "P1";
      normalizeDivisionsInPlace(fakeFactory, segments);

      // test without alignment
      const opts: IRefreshMeasureOpts = {
        document: {
          __fakeDocument: true,
        } as any,
        preview: false,
        print: null,
        fixup: null,

        lineBarOnLine: 0,
        lineCount: 1,
        lineIndex: 0,
        lineShortest: 1,
        lineTotalBarsOnLine: 1,
        header: null,
        measure: {
          idx: 0,
          uuid: 777,
          number: "1",
          parts: {},
          version: 0,
        },
        measureX: 100,
        segments: segments,
        noAlign: true,
        factory: fakeFactory,
        mode: RefreshMode.RefreshLayout,
        attributes: { P1: [] },
        singleLineMode: false,
      };
      let layout = refreshMeasure(opts).elements;
      expect(layout[0].length).toEqual(2);
      expect(layout[0][0].x).toEqual(100);
      // Occurs after division 1 or 2, so add the end of the measure
      expect(layout[0][1].x).toEqual(190);

      expect(layout[2].length).toEqual(2);
      expect(layout[2][0].x).toEqual(110); // + 10 for staff
      expect(layout[2][1].x).toEqual(120);

      expect(layout[1].length).toEqual(2);
      expect(layout[1][0].x).toEqual(110);
      expect(layout[1][1].x).toEqual(130);

      // Now test
      opts.noAlign = false;
      layout = refreshMeasure(opts).elements;
      layout[1].map((l) => delete (<any>l).key);
      expect(layout[1]).toEqual([
        {
          division: 0,
          x: 100,
          model: null,
          renderClass: Type.Attributes,
        },
        {
          boundingBoxes: [],
          division: 0,
          expandPolicy: "after",
          x: 110,
          part: "P1",
          model: segments[1][0], // from first voice.
          renderClass: Type.Chord,
        },
        {
          division: 1,
          expandPolicy: "after",
          x: 120,
          model: null,
          renderClass: Type.Chord,
        },
        {
          boundingBoxes: [],
          expandPolicy: "after",
          division: 2,
          x: 130,
          part: "P1",
          model: segments[1][1],
          renderClass: Type.Chord,
        },
        {
          division: 4,
          x: 190,
          model: null,
          renderClass: Type.Attributes,
        },
      ]);
    });
  });
  describe("layoutMeasure", function () {
    it("lays out a case with multiple voices", function () {
      const staffSegments = [null, createFakeStaffSegment(4, 4, 1)];

      const voiceSegments = [
        null,
        createFakeVoiceSegment(2, 6, 1),
        createFakeVoiceSegment(1, 7, 2),
      ];

      const layout = layoutMeasure({
        document: {
          __fakeDocument: true,
        } as any,
        preview: false,
        print: null,
        fixup: null,

        header: <any>{
          partList: [
            {
              _class: "ScorePart",
              id: "P1",
            },
          ],
        },
        measure: {
          idx: 0,
          number: "1",
          version: 0,
          parts: {
            P1: {
              voices: voiceSegments,
              staves: staffSegments,
            },
          },
          uuid: 248,
          width: NaN,
        },
        x: 100,
        lineBarOnLine: 0,
        lineTotalBarsOnLine: 0,
        lineShortest: 42,
        lineCount: 1,
        lineIndex: 0,
        factory: fakeFactory,
        attributes: { P1: [] },
        singleLineMode: false,
      });
      // We've tested this exact case in ISegment.layout$, so we can be
      // a bit soft here.
      expect(layout.paddingBottom).toEqual([undefined, 0]);
      expect(layout.paddingTop).toEqual([undefined, 0]);
      expect(layout.elements[0].length).toEqual(5);
      expect(layout.elements[0][4].x).toEqual(190);
      expect(layout.elements[0][0].x).toEqual(100);
      expect(layout.width).toEqual(100);
    });
  });
  describe("approximateWidth", function () {
    it("approximates mid-line width", function () {
      const staffSegments = [null, createFakeStaffSegment(4, 4, 1)];

      const voiceSegments = [
        null,
        createFakeVoiceSegment(2, 6, 1),
        createFakeVoiceSegment(1, 7, 2),
      ];

      const width = getApproximateMeasureWidth(
        {
          idx: 0,
          number: "1",
          version: 0,
          parts: {
            P1: {
              voices: voiceSegments,
              staves: staffSegments,
            },
          },
          uuid: 1248,
          width: NaN,
        },
        42,
      );
      // 100 - 10 for attribute 1. See createFakeStaffSegment
      expect(width).toEqual(90);
    });
  });
});
