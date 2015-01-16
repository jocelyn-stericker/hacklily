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

var expect          = chai.expect;

function makeCursor(model: Engine.IModel, factory: Factory): Engine.ICursor {
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
        factory: factory
    };
}

function FakeChord(constructors: { [key: number]: any }) {
    constructors[Engine.IModel.Type.Chord] = function() {
        // pass
    };
}

describe("[attributes.ts]", function() {
    describe("AttributesModel", function() {
        var factory = new Factory([Attributes, FakeChord]);
        var attributes: Engine.IModel;
        it("can be created", function() {
            attributes = factory.create(Engine.IModel.Type.Attributes);
            expect(!!attributes).to.be.true;
        });
        it("sets fields in validate", function() {
            expect(attributes.fields).to.deep.equal([], "By default it has no fields");

            // Divisions is set by annotator
            (<any>attributes).divisions = 100;
            expect(attributes.fields).to.deep.equal(["divisions"], "Now it has divisions");

            var cursor$ = makeCursor(attributes, factory);
            attributes.validate$(cursor$);
            expect(attributes.fields).to.deep.equal(["divisions", "clefs", "times", "keySignatures"],
                "Auto properties should be set");
        });
        it("lays out properly when at start of song", function() {
            var cursor$ = makeCursor(attributes, factory);
            var layout = <Attributes.ILayout> attributes.layout(cursor$);
            expect(layout.clefScale).to.equal(1.0);
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
