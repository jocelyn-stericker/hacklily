// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

/**
 * @file part of Satie test suite
 */

import type { IModel } from "../document";
import { Type } from "../document";
import Factory from "../engine_factory";
import BarlineModel from "../implBarline_barlineModel";

describe("[barline.ts]", function () {
  describe("BarlineModel", function () {
    const factory = new Factory([BarlineModel]);
    let barline: IModel;
    it("can be created", function () {
      barline = factory.create(Type.Barline);
      expect(!!barline).toBe(true);
    });
  });
});
