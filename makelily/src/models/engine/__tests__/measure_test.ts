/**
 * (C) Josh Netterfield <joshua@nettek.ca> 2015.
 * Part of the Satie music engraver <https://github.com/ripieno/satie>.
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

"use strict";

import Measure          = require("../measure");

import chai             = require("chai");
var expect              = chai.expect;

import ETestUtil        = require("./etestutil");

describe("[engine/measure.ts]", function() {
    describe("normalizeDivisions$", function() {
        it("correctly modifies all segments", function() {
            var segments = [
                null,
                ETestUtil.createFakeStaffSegment(4, 4),
                ETestUtil.createFakeVoiceSegment(2, 6),
                ETestUtil.createFakeVoiceSegment(4, 12),
            ];
            Measure.normalizeDivisons$(segments);
            expect(segments[1].staffSegment.attributes.divisions).to.equal(16);
            expect(segments[2].voiceSegment.divisions).to.equal(16);
            expect(segments[3].voiceSegment.divisions).to.equal(16);
            expect(segments[1].staffSegment.models[1].divCount).to.equal(8);
            expect(segments[2].voiceSegment.models[0].divCount).to.equal(4);
            expect(segments[3].voiceSegment.models[1].divCount).to.equal(12);

        });
    });
});
