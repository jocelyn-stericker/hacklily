// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

/**
 * @file part of Satie test suite
 */

import { normalizeDivisionsInPlace } from "../engine_divisions";
import {
  createFakeStaffSegment,
  createFakeVoiceSegment,
  fakeFactory,
} from "./etestutil";

describe("[document/segment.ts]", function () {
  describe("normalizeDivisionsInPlace", function () {
    it("correctly modifies all segments", function () {
      const segments = [
        createFakeStaffSegment(4, 4, 1),
        createFakeVoiceSegment(2, 6, 1),
        createFakeVoiceSegment(4, 12, 2),
      ];
      normalizeDivisionsInPlace(fakeFactory, segments);
      expect(segments[0].divisions).toEqual(16);
      expect(segments[1].divisions).toEqual(16);
      expect(segments[2].divisions).toEqual(16);
      expect(segments[0][1].divCount).toEqual(8);
      expect(segments[1][0].divCount).toEqual(4);
      expect(segments[2][1].divCount).toEqual(12);
    });
  });
});
