// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

/* eslint-disable no-shadow */

/**
 * @file part of Satie test suite
 */

import { Type } from "../document";
import Factory from "../engine_factory";

class TestClass1 {}

class TestClass2 {}

describe("[factory.ts]", function () {
  describe("Factory", function () {
    const types = [
      function (types: { [key: number]: any }) {
        types[Type.Attributes as any] = TestClass1;
      },
      function (types: { [key: number]: any }) {
        types[Type.Chord as any] = TestClass2;
      },
    ];

    const factory = new Factory(types);

    it("can create multiple types", function () {
      expect(factory.create(Type.Attributes)).toBeInstanceOf(TestClass1);
      expect(factory.create(Type.Chord)).toBeInstanceOf(TestClass2);
    });

    it("can discern multiple types", function () {
      expect(
        factory.modelHasType(<any>new TestClass1(), Type.Attributes),
      ).toEqual(true);
      expect(factory.modelHasType(<any>new TestClass1(), Type.Chord)).toEqual(
        false,
      );
      expect(factory.modelHasType(<any>new TestClass2(), Type.Chord)).toEqual(
        true,
      );
      expect(
        factory.modelHasType(<any>new TestClass2(), Type.Attributes),
      ).toEqual(false);
    });

    it("throws on creating invalid type", function () {
      expect(function () {
        factory.create(Type.Print);
      }).toThrow();
    });

    it("throws on discerning invalid type", function () {
      expect(function () {
        factory.modelHasType(<any>new TestClass1(), Type.Print);
      }).toThrow();
    });
  });
});
