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

import chai         = require("chai");

import Attributes   = require("../attributes");
import Engine       = require("../engine");
import Factory      = require("../factory");

let expect          = chai.expect;

export function makeCursor(factory: Factory, models: Engine.IModel[]): Engine.ICursor {
    (<any>models).part = "P1";
    return {
        segment:            <any> models,
        idx$:               0,

        voice:              {},
        staff: {
            previous:       null,
            attributes: {
                divisions: 60,
                clefs: [{
                    sign: "G",
                    clefOctaveChange: "0",
                    line: 2
                }],
                times: [{
                    beats: ["4"],
                    beatTypes: [4],
                    senzaMisura: null
                }]
            },
            totalDivisions: 240,
            accidentals$:   {},
            idx:            0
        },
        measure: {
            idx:            0,
            number:         "1",
            implicit:       false,
            nonControlling: false,
            x:              100,
            attributes$:    null,
            uuid:           100,
            parent:         <any> {
                parts: {
                    "P1": {
                        staves: [
                            null,
                            {
                                staves: []  
                            }
                        ]
                    }
                }
            }
        },
        line: {
            shortestCount:  Number.MAX_VALUE,
            barOnLine$:     0,
            barsOnLine:     1,
            line:           0,
            lines:          1
        },
        print$:             null,
        header:             null,

        prev$:              null,
        division$:          0,
        x$:                 100,
        minXBySmallest$:    {},
        maxPaddingTop$:     [],
        maxPaddingBottom$:  [],

        page$:              NaN,

        approximate:        false,
        detached:           true,
        factory:            factory
    };
}

function FakeChord(constructors: { [key: number]: any }) {
    constructors[Engine.IModel.Type.Chord] = function() {
        // pass
    };
}

describe("[attributes.ts]", function() {
    describe("AttributesModel", function() {
        let factory = new Factory([Attributes, FakeChord]);
        let attributes: Engine.IModel;
        it("can be created", function() {
            attributes = factory.create(Engine.IModel.Type.Attributes);
            expect(!!attributes).to.be.true;
            // Divisions is usually set by Engine
            (<any>attributes).divisions = 100;

            let cursor$ = makeCursor(factory, [attributes]);
            cursor$.staff.attributes = {};
            attributes.validate$(cursor$);
        });
        it("lays out properly when at start of song", function() {
            let cursor$ = makeCursor(factory, [attributes]);
            cursor$.staff.attributes = {};
            let layout = <Attributes.ILayout> attributes.layout(cursor$);
            expect(layout.ksVisible).to.be.true;
            expect(layout.tsVisible).to.be.true;
            expect(layout.clefVisible).to.be.true;
            expect(layout.tsSpacing).to.be.gt(0);
            expect(layout.clefSpacing).to.be.gt(0);
            expect(layout.ksSpacing).to.be.gt(0);

            expect(layout.x$).to.be.lt(cursor$.x$);
            expect(cursor$.x$ - layout.x$).to.equal(layout.clefSpacing + layout.tsSpacing + layout.ksSpacing);
        });
    });
});
