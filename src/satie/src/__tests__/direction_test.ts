// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

/**
 * @file part of Satie test suite
 */

import type { IModel } from "../document";
import { Type } from "../document";
import Factory from "../engine_factory";
import Direction from "../implDirection_directionModel";

describe("[direction.ts]", function () {
  describe("DirectionModel", function () {
    const factory = new Factory([Direction]);
    let direction: IModel;
    it("can be created", function () {
      direction = factory.create(Type.Direction);
      expect(!!direction).toBe(true);
    });
  });
});
