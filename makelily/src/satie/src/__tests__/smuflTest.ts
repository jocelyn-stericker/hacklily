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

import {bboxes, bravura, getGlyphCode} from "../private_smufl";

import {expect} from "chai";

describe("[smufl.ts]", function() {
    describe("bboxes", function() {
        // TODO: Refactor so SMuFL does not contain Bravura stuff.

        it("is simply bravuraMetadata indexed by 4th index (key)", function() {
            // Note: you may need to change this if the Bravura order changes.
            expect(bboxes["4stringTabClef"]).to.deep.equal(bravura.glyphBBoxes[0]);
        });
    });
    describe("getGlyphCode", function() {
        it("returns a string with the codepoint", function() {
            expect(getGlyphCode("flag8thUp")).to.equal("\uE240");
        });
    });
});
