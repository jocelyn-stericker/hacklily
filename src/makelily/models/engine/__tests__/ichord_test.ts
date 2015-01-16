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

import IChord           = require("../ichord");

import ICursor          = require("../icursor");
import IModel           = require("../imodel");

import MusicXML         = require("musicxml-interfaces");
import chai             = require("chai");
var expect              = chai.expect;

function makeCursor(model: IModel): ICursor {
    return {
        segment: {
            models: [model]
        },
        idx$: 0,

        voice: {},
        staff: {
            previous: null,
            attributes: {},
            totalDivisions: NaN,
            accidentals$: {},
            idx: 0
        },
        measure: {
            idx: 0,
            number: "1",
            implicit: false,
            nonControlling: false,
            x: 100,
            attributes$: null,
            uuid: 100
        },
        line: {
            shortestCount: 0,
            barOnLine: 0
        },
        print$: null,
        header: null,

        prev$: null,
        division$: 0,
        x$: 100,
        minXBySmallest$: {},
        maxPaddingTop$: 0,
        maxPaddingBottom$: 0,

        approximate: false,
        detached: true,
        factory: null
    };
}

describe("[engine/ichord.ts]", function() {
    describe("hasAccidental", function() {
        it("works with rests", function() {
            var notes: MusicXML.Note[] = [{
                rest: {}
            }];
            var cursor = makeCursor(<any> notes);
            expect(IChord.hasAccidental(notes, cursor)).to.eq(false);
        });
    });
});
