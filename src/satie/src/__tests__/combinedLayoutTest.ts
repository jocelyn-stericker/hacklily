// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

/**
 * @file part of Satie test suite
 */

import { times, reduce } from "lodash";

import { Type } from "../document";
import type { ICombinedLayout } from "../private_combinedLayout";
import { mergeSegmentsInPlace } from "../private_combinedLayout";
import { createFakeLayout } from "./etestutil";

describe("[private/combinedLayout.ts]", function () {
  describe("merge", function () {
    it("handles multiple segments", function () {
      const layout1 = times(5, (idx) => createFakeLayout(idx, 0, true));
      const layout2 = times(5, (idx) =>
        createFakeLayout(idx, idx ? 2 : 0, true),
      );
      let combinedLayout: ICombinedLayout[] = [];

      combinedLayout = reduce(
        [layout1, layout2],
        mergeSegmentsInPlace,
        combinedLayout,
      );
      combinedLayout = reduce(
        [layout1, layout2],
        mergeSegmentsInPlace,
        combinedLayout,
      );

      expect(combinedLayout).toEqual([
        {
          renderClass: Type.Attributes,
          x: 0,
          division: 0,
        },
        {
          renderClass: Type.Attributes,
          x: 100,
          division: 4,
        },
        {
          renderClass: Type.Attributes,
          x: 100 + (10 * Math.log(3)) / Math.log(2),
          division: 6,
        },
        {
          renderClass: Type.Attributes,
          x: 200,
          division: 8,
        },
        {
          renderClass: Type.Attributes,
          x: 200 + (10 * Math.log(3)) / Math.log(2),
          division: 10,
        },
        {
          renderClass: Type.Attributes,
          x: 300,
          division: 12,
        },
        {
          renderClass: Type.Attributes,
          x: 300 + (10 * Math.log(3)) / Math.log(2),
          division: 14,
        },
        {
          renderClass: Type.Attributes,
          x: 400,
          division: 16,
        },
        {
          renderClass: Type.Attributes,
          x: 400 + (10 * Math.log(3)) / Math.log(2),
          division: 18,
        },
      ]);
      expect(layout1).toHaveLength(9);
      expect(layout2).toHaveLength(9);
      expect(layout1.slice(0, 3)).toEqual([
        {
          boundingBoxes: [],
          division: 0,
          renderClass: Type.Attributes,
          model: {},
          x: 0,
        },
        {
          boundingBoxes: [],
          division: 4,
          renderClass: Type.Attributes,
          model: {},
          x: 100,
        },
        {
          division: 6,
          renderClass: Type.Attributes,
          model: null,
          x: 100 + (10 * Math.log(3)) / Math.log(2),
        },
      ]);
    });
  });
});
