// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

/**
 * @file part of Satie test suite
 */

import type { IModel } from "../document";
import { Type } from "../document";
import Factory from "../engine_factory";
import Sound from "../implSound_soundModel";

describe("[sound.ts]", function () {
  describe("SoundModel", function () {
    const factory = new Factory([Sound]);
    let sound: IModel;
    it("can be created", function () {
      sound = factory.create(Type.Sound);
      expect(!!sound).toBe(true);
    });
  });
});
