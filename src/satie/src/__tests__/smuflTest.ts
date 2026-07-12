// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

/**
 * @file part of Satie test suite
 */

import { bboxes, bravura, getGlyphCode } from "../private_smufl";

describe("[smufl.ts]", function () {
  describe("bboxes", function () {
    // TODO: Refactor so SMuFL does not contain Bravura stuff.

    it("is simply bravuraMetadata indexed by 4th index (key)", function () {
      // Note: you may need to change this if the Bravura order changes.
      expect(bboxes["4stringTabClef"]).toEqual(bravura.glyphBBoxes[0]);
    });
  });
  describe("getGlyphCode", function () {
    it("returns a string with the codepoint", function () {
      expect(getGlyphCode("flag8thUp")).toEqual("\uE240");
    });
  });
});
