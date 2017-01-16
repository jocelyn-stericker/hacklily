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

import {IStaffContext, detachStaffContext} from "../private_staffContext";

import {expect} from "chai";

import {cloneObject} from "../private_util";

describe("[engine/context.ts]", function() {
    describe("Ctx.IStaff.detach", function() {
        it("produces object independent of parent", function() {
            let orig: IStaffContext = {
                previous: null,
                attributes: <any> {},
                totalDivisions: NaN,
                accidentals$: {},
                // division: 10,
                idx: 0
            };
            let orig2 = cloneObject(orig);
            let copy = detachStaffContext(orig);
            orig2.totalDivisions = NaN; // HACK: cloneObject makes NaN -> null

            copy.previous = orig;
            copy.accidentals$["a"] = 1;

            expect(copy.attributes.instruments).to.not.equal("piano"); // Frozen
            copy.accidentals$["a"] = 1;

            expect(orig).to.deep.equal(orig2);
        });

        it("does not freeze attributes or parent of owner", function() {
            let parent: IStaffContext = {
                previous: null,
                attributes: <any> {},
                totalDivisions: NaN,
                accidentals$: {},
                // division: 10,
                idx: 0
            };

            let orig: IStaffContext = {
                previous: parent,
                attributes: <any> {},
                totalDivisions: NaN,
                accidentals$: {},
                // division: 10,
                idx: 0
            };
            let copy = detachStaffContext(orig);
            orig.attributes.instruments = "piano";
            orig.previous.accidentals$["a"] = 1;
            expect(orig.attributes.instruments).to.equal("piano");
            expect(copy.attributes.instruments).to.equal("piano");
        });
    });
});
