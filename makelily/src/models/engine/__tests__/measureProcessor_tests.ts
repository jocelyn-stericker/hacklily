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

import MeasureProcessor  = require("../measureProcessor");

import chai             = require("chai");
var expect              = chai.expect;

import Engine           = require("../../engine");
import ETestUtil        = require("./etestutil");

describe("[engine/measureProcessor.ts]", function() {
    describe("reduce", function() {
        it("can lay out multiple voices", function() {
            var segments = [
                ETestUtil.createFakeStaffSegment(4, 4, 1), // 00001111
                ETestUtil.createFakeVoiceSegment(2, 6, 1), // 00111111
                ETestUtil.createFakeVoiceSegment(1, 7, 2)  // 01111111
            ];
            segments[0].owner = 1;
            segments[1].owner = 1;
            segments[2].owner = 2;
            Engine.Measure.normalizeDivisons$(segments);

            // test without alignment
            var opts: MeasureProcessor.ILayoutOpts = {
                attributes:         null,
                line:               Engine.Ctx.ILine.create(segments),
                header:             null,
                measure: {
                    attributes$:    null,
                    idx:            0,
                    implicit:       false,
                    nonControlling: false,
                    number:         "1",
                    uuid:           777,
                    x:              100
                },
                prevByStaff:        [],
                segments:           segments,
                _noAlign:           true,
                factory:            ETestUtil.fakeAttributeChordFactory
            };
            var layout = MeasureProcessor.reduce(opts).elements;
            expect(layout[0].length).to.equal(2);
            expect(layout[0][0].x$).to.equal(110, "without merging"); // + 10 for staff
            expect(layout[0][1].x$).to.equal(130, "without merging"); // ...

            expect(layout[1].length).to.equal(2);
            expect(layout[1][0].x$).to.equal(110, "without merging"); // ...
            expect(layout[1][1].x$).to.equal(120, "without merging"); // ...

            expect(layout[2].length).to.equal(2);
            expect(layout[2][0].x$).to.equal(100, "without merging");
            expect(layout[2][1].x$).to.equal(190, "without merging"); // Occurs after division 1 or 2,
                                                    // so add the end of the measure

            // Now test 
            opts._noAlign = false;
            layout = MeasureProcessor.reduce(opts).elements;
            expect(layout[0]).to.deep.equal(
                [
                    {
                        division: 0,
                        mergePolicy: Engine.IModel.HMergePolicy.Min,
                        x$: 100,
                        model: null,
                        renderClass: Engine.IModel.Type.Attributes
                    },
                    {
                        boundingBoxes$: [],
                        division: 0,
                        expandable: true,
                        mergePolicy: Engine.IModel.HMergePolicy.Min,
                        x$: 110,
                        model: segments[1][0],  // from first voice.
                        renderClass: Engine.IModel.Type.Chord
                    },
                    {
                        division: 1,
                        expandable: true,
                        mergePolicy: Engine.IModel.HMergePolicy.Max, // 1st is min, 2nd one is max
                        x$: 120,
                        model: null,
                        renderClass: Engine.IModel.Type.Chord
                    },
                    {
                        boundingBoxes$: [],
                        expandable: true,
                        division: 2,
                        mergePolicy: Engine.IModel.HMergePolicy.Max, // 1st is min, 2nd one is max
                        x$: 130,
                        model: segments[1][1],
                        renderClass: Engine.IModel.Type.Chord
                    },
                    {
                        division: 4,
                        mergePolicy: Engine.IModel.HMergePolicy.Max,
                        x$: 190,
                        model: null,
                        renderClass: Engine.IModel.Type.Attributes
                    },
                ]
            );
        });
    });
});
