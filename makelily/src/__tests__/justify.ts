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

import {OddEvenBoth} from "musicxml-interfaces";
import {map, forEach} from "lodash";
import {expect} from "chai";

import {detach} from "../private_measureLayout";
import {createFakeVoiceSegment, createFakeStaffSegment, fakeFactory}
    from "./etestutil";

import Justify from "../implLine_justifyPostprocessor";
import {layoutMeasure} from "../engine_processors_measure";

describe("[lineProcessor.ts]", function() {
    describe("justify", function() {
        it("partially justifies multiple voices and measures on the final line", function() {
            let segments = [
                {
                    staves: [null, createFakeStaffSegment(4, 4, 1)],
                    voices: [
                        null,
                        createFakeVoiceSegment(2, 6, 1),
                        createFakeVoiceSegment(1, 7, 2)
                    ]
                },
                {
                    staves: [null, createFakeStaffSegment(4, 4, 1)],
                    voices: [
                        null,
                        createFakeVoiceSegment(1, 7, 1),
                        createFakeVoiceSegment(2, 6, 2)
                    ]
                }
            ];

            let layouts = map(segments, (seg, idx) => layoutMeasure({
                attributes: {"P1": []},
                document: {
                    __fakeDocument: true
                } as any,
                preview: false,
                print: null,
                fixup: null,

                measure: {
                    idx: idx,
                    number: String(idx + 1),
                    version: 0,
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
                    partList: [
                        {
                            _class: "ScorePart",
                            id: "P1"
                        }
                    ]
                },
                x: 0,
                lineBarOnLine: 0,
                lineCount: 1,
                lineIndex: 0,
                lineShortest: 1,
                lineTotalBarsOnLine: 1,
                factory: fakeFactory,
                singleLineMode: false,
            }));

            let padding = 12;
            let detachedLayouts = map(layouts, detach);
            forEach(detachedLayouts, layout => {
                layout.attributes = <any> {
                    P1: [, {
                        divisions: 4,
                        time: {
                            beats: ["4"],
                            beatTypes: [4]
                        }
                    }]
                };
            });

            let justified = Justify(
                {
                    document: {
                        __fakeDocument: true
                    } as any,
                    preview: false,
                    fixup: null,

                    attributes: {},
                    lineCount: 1,
                    lineIndex: 0,
                    measures: new Array(2),
                    header: <any> {
                        partList: [
                            {
                                _class: "ScorePart",
                                id: "P1"
                            }
                        ]
                    },
                    print: <any> {
                        pageLayout: {
                            pageHeight: 1000,
                            pageWidth: 1000,
                            pageMargins: [{
                                leftMargin: padding,
                                rightMargin: padding,
                                bottomMargin: padding,
                                topMargin: padding,
                                type: OddEvenBoth.Both
                            }]
                        }
                    },
                    modelFactory: fakeFactory,
                    preprocessors: [],
                    postprocessors: [Justify],
                    singleLineMode: false,
                },
                {
                    left: 12,
                    right: 1000 - 12,
                    systemLayout: null,
                    top: 0,
                },
                detachedLayouts);

            let expectedWidth = justified[0].elements[0][4].x -
                justified[0].elements[0][0].x + 10;
            expect(justified[0].elements[0][0].x).to.be.closeTo(layouts[0].elements[0][0].x, 0.05);
            expect(justified[0].elements[0][2].x).to.be.closeTo(24.16, 0.1);
            expect(justified[0].width).to.be.closeTo(expectedWidth, 0.01);
            forEach(justified, function(just, idx) {
                expect(just.width).to.not.equal(layouts[idx].width);
            });
        });
    });
});
