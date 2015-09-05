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

import AttributesModel from "../attributes";

import {expect} from "chai";

import {IModel, ICursor} from "../../engine";
import Factory from "../factory";

export function makeCursor(factory: Factory, models: IModel[]): ICursor {
    (<any>models).part = "P1";
    return {
        segment: <any> models,
        idx$: 0,

        voice: {},
        staff: {
            previous: null,
            attributes: <any> {
                divisions: 60,
                clef: {
                    sign: "G",
                    clefOctaveChange: "0",
                    line: 2
                },
                time: {
                    beats: ["4"],
                    beatTypes: [4],
                    senzaMisura: null
                }
            },
            totalDivisions: 240,
            accidentals$: {},
            idx: 0
        },
        measure: {
            idx: 0,
            number: "1",
            implicit: false,
            nonControlling: false,
            x: 100,
            attributes: null,
            uuid: 100,
            parent: <any> {
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
            shortestCount: Number.MAX_VALUE,
            barOnLine$: 0,
            barsOnLine: 1,
            line: 0,
            lines: 1
        },
        print$: null,
        header: <any> {
            partList: [
                {
                    _class: "ScorePart",
                    id: "P1"
                }
            ],
        },

        division$: 0,
        x$: 100,
        minXBySmallest$: {},
        maxPaddingTop$: [],
        maxPaddingBottom$: [],

        page$: NaN,

        approximate: false,
        detached: true,
        factory: factory
    };
}

function FakeChord(constructors: { [key: number]: any }) {
    constructors[IModel.Type.Chord] = function() {
        // pass
    };
}

describe("[attributes.ts]", function() {
    describe("AttributesModel", function() {
        let factory = new Factory([AttributesModel, FakeChord]);
        let attributes: IModel;
        it("can be created", function() {
            attributes = factory.create(IModel.Type.Attributes);
            expect(!!attributes).to.be.true;
            // Divisions is usually set by the engine
            (<any>attributes).divisions = 100;

            let cursor$ = makeCursor(factory, [attributes]);
            cursor$.staff.attributes = <any> {};
            attributes.validate$(cursor$);
        });
        it("lays out properly when at start of song", function() {
            let cursor$ = makeCursor(factory, [attributes]);
            cursor$.staff.attributes = <any> {};
            let layout = <AttributesModel.ILayout> attributes.layout(cursor$);
            expect(!!layout.keySignature).to.be.true;
            expect(!!layout.time).to.be.true;
            expect(!!layout.clef).to.be.true;
            expect(layout.tsSpacing).to.be.gt(0);
            expect(layout.clefSpacing).to.be.gt(0);
            expect(layout.ksSpacing).to.be.gt(0);

            expect(layout.x$).to.be.lt(cursor$.x$);
            let expectedChange = layout.clefSpacing + layout.tsSpacing + layout.ksSpacing;
            expect(cursor$.x$ - layout.x$).to.equal(expectedChange);
        });
    });
});
