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

import Sound from "../implSound_soundModel";

import {expect} from "chai";

import {IModel} from "../document_model";
import Type from "../document_types";

import Factory from "../engine_factory";

describe("[sound.ts]", function() {
    describe("SoundModel", function() {
        let factory = new Factory([Sound]);
        let sound: IModel;
        it("can be created", function() {
            sound = factory.create(Type.Sound);
            expect(!!sound).to.be.true;
        });
    });
});
