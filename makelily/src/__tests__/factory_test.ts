/**
 * This file is part of Satie music engraver <https://github.com/jnetterf/satie>.
 * Copyright (C) Joshua Netterfield <joshua.ca> 2015 - present.
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

import Factory from "../engine_factory";

import {expect} from "chai";

import Type from "../document_types";

class TestClass1 {
}

class TestClass2 {
}

describe("[factory.ts]", function() {
    describe("Factory", function() {
        let types = [
            function(types: {[key: number]: any}) {
                types[Type.Attributes as any] = TestClass1;
            },
            function(types: {[key: number]: any}) {
                types[Type.Chord as any] = TestClass2;
            }
        ];

        let factory = new Factory(types);

        it("can create multiple types", function() {
            expect(factory.create(Type.Attributes)).to.be.an.instanceof(TestClass1);
            expect(factory.create(Type.Chord)).to.be.an.instanceof(TestClass2);
        });

        it("can discern multiple types", function() {
            expect(factory.modelHasType(<any> new TestClass1,
                    Type.Attributes)).to.equal(true);
            expect(factory.modelHasType(<any> new TestClass1,
                    Type.Chord)).to.equal(false);
            expect(factory.modelHasType(<any> new TestClass2,
                    Type.Chord)).to.equal(true);
            expect(factory.modelHasType(<any> new TestClass2,
                    Type.Attributes)).to.equal(false);
        });

        it("throws on creating invalid type", function() {
            expect(function() {
                factory.create(Type.Print);
            }).to.throw();
        });

        it("throws on discerning invalid type", function() {
            expect(function() {
                factory.modelHasType(<any> new TestClass1, Type.Print);
            }).to.throw();
        });
    });
});
