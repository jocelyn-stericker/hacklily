// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

/**
 * @file part of Satie test suite
 */

import { map, forEach } from "lodash";

import { OddEvenBoth } from "#/musicxml-interfaces";

import { layoutMeasure } from "../engine_processors_measure";
import Justify from "../implLine_justifyPostprocessor";
import { detach } from "../private_measureLayout";
import {
  createFakeVoiceSegment,
  createFakeStaffSegment,
  fakeFactory,
} from "./etestutil";

describe("[lineProcessor.ts]", function () {
  describe("justify", function () {
    it("partially justifies multiple voices and measures on the final line", function () {
      const segments = [
        {
          staves: [null, createFakeStaffSegment(4, 4, 1)],
          voices: [
            null,
            createFakeVoiceSegment(2, 6, 1),
            createFakeVoiceSegment(1, 7, 2),
          ],
        },
        {
          staves: [null, createFakeStaffSegment(4, 4, 1)],
          voices: [
            null,
            createFakeVoiceSegment(1, 7, 1),
            createFakeVoiceSegment(2, 6, 2),
          ],
        },
      ];

      const layouts = map(segments, (seg, idx) =>
        layoutMeasure({
          attributes: { P1: [] },
          document: {
            __fakeDocument: true,
          } as any,
          preview: false,
          print: null,
          fixup: null,

          measure: {
            idx: idx,
            number: String(idx + 1),
            version: 0,
            parts: {
              P1: {
                voices: seg.voices,
                staves: seg.staves,
              },
            },
            uuid: 1248 + idx,
            width: NaN,
          },
          header: <any>{
            partList: [
              {
                _class: "ScorePart",
                id: "P1",
              },
            ],
          },
          x: 0,
          lineBarOnLine: 0,
          lineCount: 1,
          lineIndex: 0,
          lineShortest: 1,
          lineTotalBarsOnLine: 1,
          factory: fakeFactory,
          singleLineMode: false,
        }),
      );

      const padding = 12;
      const detachedLayouts = map(layouts, detach);
      forEach(detachedLayouts, (layout) => {
        layout.attributes = <any>{
          P1: [
            undefined,
            {
              divisions: 4,
              time: {
                beats: ["4"],
                beatTypes: [4],
              },
            },
          ],
        };
      });

      const justified = Justify(
        {
          document: {
            __fakeDocument: true,
          } as any,
          preview: false,
          fixup: null,

          attributes: {},
          lineCount: 1,
          lineIndex: 0,
          measures: new Array(2),
          header: <any>{
            partList: [
              {
                _class: "ScorePart",
                id: "P1",
              },
            ],
          },
          print: <any>{
            pageLayout: {
              pageHeight: 1000,
              pageWidth: 1000,
              pageMargins: [
                {
                  leftMargin: padding,
                  rightMargin: padding,
                  bottomMargin: padding,
                  topMargin: padding,
                  type: OddEvenBoth.Both,
                },
              ],
            },
          },
          modelFactory: fakeFactory,
          preprocessors: [],
          postprocessors: [Justify],
          singleLineMode: false,
        },
        {
          left: 12,
          right: 1000 - 12,
          systemLayout: null,
          top: 0,
        },
        detachedLayouts,
      );

      const expectedWidth =
        justified[0].elements[0][4].x - justified[0].elements[0][0].x + 10;
      expect(justified[0].elements[0][0].x).toBeGreaterThan(
        layouts[0].elements[0][0].x - 0.05,
      );
      expect(justified[0].elements[0][0].x).toBeLessThan(
        layouts[0].elements[0][0].x + 0.05,
      );
      expect(justified[0].elements[0][2].x).toBeGreaterThan(24.16 - 0.1);
      expect(justified[0].elements[0][2].x).toBeLessThan(24.16 + 0.1);
      expect(justified[0].width).toBeGreaterThan(expectedWidth - 0.01);
      expect(justified[0].width).toBeLessThan(expectedWidth + 0.01);
      forEach(justified, function (just, idx) {
        expect(just.width).not.toEqual(layouts[idx].width);
      });
    });
  });
});
