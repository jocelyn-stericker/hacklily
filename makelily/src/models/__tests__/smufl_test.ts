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

import chai = require("chai");
let expect = chai.expect;

import SMuFL = require("../smufl");

describe("[smufl.ts]", function() {
    describe("bboxes", function() {
        // TODO: Refactor so SMuFL does not contain Bravura stuff.

        it("is simply bravuraMetadata indexed by 4th index (key)", function() {
            // Note: you may need to change this if the Bravura order changes.
            expect(SMuFL.bboxes["4stringTabClef"]).to.deep.equal(SMuFL.bravura.glyphBBoxes[0]);
        });
        it("contains the same amount of information as bravuraMetadata", function() {
            expect(Object.keys(SMuFL.bboxes).length).to.equal(
                SMuFL.bravura.glyphBBoxes.length);
        });
    });
    describe("getGlyphCode", function() {
        it("returns a string with the codepoint", function() {
            expect(SMuFL.getGlyphCode("flag8thUp")).to.equal("\uE240");
        });
    });
});
