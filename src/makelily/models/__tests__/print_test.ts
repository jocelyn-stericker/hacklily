/**
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

"use strict";

import Print from "../print";

import {expect} from "chai";

import {IModel} from "../../engine";
import Factory from "../factory";

describe("[print.ts]", function() {
    describe("PrintModel", function() {
        let factory = new Factory([Print]);
        let print: IModel;
        it("can be created", function() {
            print = factory.create(IModel.Type.Print);
            expect(!!print).to.be.true;
        });
    });
});
