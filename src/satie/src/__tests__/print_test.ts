// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

/**
 * @file part of Satie test suite
 */

import type { IModel } from "../document";
import { Type } from "../document";
import Factory from "../engine_factory";
import Print from "../implPrint_printModel";

describe("[print.ts]", function () {
  describe("PrintModel", function () {
    const factory = new Factory([Print]);
    let print: IModel;
    it("can be created", function () {
      print = factory.create(Type.Print);
      expect(!!print).toBe(true);
    });
  });
});
