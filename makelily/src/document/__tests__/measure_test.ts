/**
 * @source: https://github.com/jnetterf/satie/
 *
 * @license
 * (C) Josh Netterfield <joshua@nettek.ca> 2015.
 * Part of the Satie music engraver <https://github.com/jnetterf/satie>.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * @file part of Satie test suite
 */

import {normalizeDivisionsInPlace} from "../segment";

import {expect} from "chai";

import {createFakeStaffSegment, createFakeVoiceSegment} from "../../engine/__tests__/etestutil";

describe("[document/segment.ts]", function() {
    describe("normalizeDivisionsInPlace", function() {
        it("correctly modifies all segments", function() {
            let segments = [
                createFakeStaffSegment(4, 4, 1),
                createFakeVoiceSegment(2, 6, 1),
                createFakeVoiceSegment(4, 12, 2),
            ];
            normalizeDivisionsInPlace(segments);
            expect(segments[0].divisions).to.equal(16);
            expect(segments[1].divisions).to.equal(16);
            expect(segments[2].divisions).to.equal(16);
            expect(segments[0][1].divCount).to.equal(8);
            expect(segments[1][0].divCount).to.equal(4);
            expect(segments[2][1].divCount).to.equal(12);

        });
    });
});
