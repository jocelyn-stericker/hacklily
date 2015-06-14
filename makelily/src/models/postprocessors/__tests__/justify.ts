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

import MusicXML = require("musicxml-interfaces");
import _ = require("lodash");
import chai = require("chai");

var expect = chai.expect;

import ETestUtil = require("../../engine/__tests__/etestutil");
import Justify = require("../justify");
import Measure = require("../../engine/measure");
import MeasureProcessor = require("../../engine/measureProcessor");

describe("[lineProcessor.ts]", function() {
    describe("justify", function() {
        it("partially justifies multiple voices and measures on the final line", function() {
            var segments = [
                {
                    staves: [null, ETestUtil.createFakeStaffSegment(4, 4, 1)],
                    voices: [
                        null,
                        ETestUtil.createFakeVoiceSegment(2, 6, 1),
                        ETestUtil.createFakeVoiceSegment(1, 7, 2)
                    ]
                },
                {
                    staves: [null, ETestUtil.createFakeStaffSegment(4, 4, 1)],
                    voices: [
                        null,
                        ETestUtil.createFakeVoiceSegment(1, 7, 1),
                        ETestUtil.createFakeVoiceSegment(2, 6, 2)
                    ]
                }
            ];

            var layouts = _.map(segments, (seg, idx) => MeasureProcessor.layoutMeasure({
                attributes: {
                    P1: {
                        divisions: 4,
                        times: [{
                            senzaMisura: null,
                            beats: ["1"],
                            beatTypes: [4]
                        }]
                    }
                },
                maxX: 1000,
                minX: 0,
                measure: {
                    idx: idx,
                    number: (idx + 1) + "",
                    parts: {
                        "P1": {
                            voices: seg.voices,
                            staves: seg.staves
                        }
                    },
                    uuid: 1248 + idx,
                    width: NaN
                },
                header: <any> {
                    partList: {
                        scoreParts: [{
                            id: "P1"
                        }]
                    }
                },
                prevByStaff: [],
                x: 0,
                line: null,
                factory: ETestUtil.fakeAttributeChordFactory
            }));

            var padding = 12;
            let detachedLayouts = _.map(layouts, layout => Measure.IMeasureLayout.detach(layout));

            var justified = Justify(
                {
                    attributes: {},
                    line: 0,
                    lines: 1,
                    // TODO: if justify uses measures, this will have to be given a proper value:
                    measures: new Array(2),
                    header: <any> {
                        partList: {
                            scoreParts: [{
                                id: "P1"
                            }]
                        }
                    },
                    page$: 0,
                    print$: <any> {
                        pageLayout: {
                            pageHeight: 1000,
                            pageWidth: 1000,
                            pageMargins: [{
                                leftMargin: padding,
                                rightMargin: padding,
                                bottomMargin: padding,
                                topMargin: padding,
                                type: MusicXML.OddEvenBoth.Both
                            }]
                        }
                    },
                    modelFactory: ETestUtil.fakeAttributeChordFactory,
                    preProcessors: [],
                    postProcessors: [Justify]
                },
                {
                    left: 12,
                    right: 1000 - 12,
                    systemLayout: null
                },
                detachedLayouts);

            let expectedWidth = justified[0].elements[0][4].x$ -
                justified[0].elements[0][0].x$ + 10;
            expect(justified[0].elements[0][0].x$).to.be.closeTo(layouts[0].elements[0][0].x$, 0.05);
            expect(justified[0].elements[0][2].x$).to.be.closeTo(73.7, 0.1);
            expect(justified[0].width).to.be.closeTo(expectedWidth, 0.01);
            _.forEach(justified, function(just, idx) {
                expect(just.width).to.not.equal(layouts[idx].width);
            });
        });
    });
});
