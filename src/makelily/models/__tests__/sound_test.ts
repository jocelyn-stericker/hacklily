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

import Sound = require("../sound");
import Engine = require("../engine");
import Factory = require("../factory");

var expect = chai.expect;

describe("[sound.ts]", function() {
    describe("SoundModel", function() {
        var factory = new Factory([Sound]);
        var sound: Engine.IModel;
        it("can be created", function() {
            sound = factory.create(Engine.IModel.Type.Sound);
            expect(!!sound).to.be.true;
        });
    });
});
