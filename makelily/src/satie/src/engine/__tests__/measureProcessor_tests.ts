/**
 * @source: https://github.com/jnetterf/satie/
 *
 * @license
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

import {ILayoutOpts, approximateLayout, reduceMeasure, layoutMeasure}
        from "../processors/measure";

import {expect} from "chai";

import ExpandPolicy from "../../document/expandPolicies";
import Type from "../../document/types";
import {normalizeDivisionsInPlace} from "../../document/segment";

import {createLineContext} from "../../private/lineContext";

import {createFakeVoiceSegment, createFakeStaffSegment, fakeFactory} from "./etestutil";

describe("[engine/measureProcessor.ts]", function() {
    describe("reduce", function() {
        it("can lay out multiple voices", function() {
            let segments = [
                createFakeStaffSegment(4, 4, 1), // 00001111
                createFakeVoiceSegment(2, 6, 1), // 00111111
                createFakeVoiceSegment(1, 7, 2)  // 01111111
            ];
            segments[0].owner = 1;
            segments[0].part = "P1";
            segments[1].owner = 1;
            segments[1].part = "P1";
            segments[2].owner = 2;
            segments[2].part = "P1";
            normalizeDivisionsInPlace(fakeFactory, segments);

            // test without alignment
            let opts: ILayoutOpts = {
                document: {
                    __fakeDocument: true
                } as any,
                preview: false,
                print: null,
                memo$: null,
                fixup: null,

                attributes: <any> {},
                line: createLineContext(segments, 1, 0, 1),
                header: null,
                padEnd: false,
                measure: {
                    attributes: <any> {},
                    idx: 0,
                    implicit: false,
                    nonControlling: false,
                    number: "1",
                    version: 0,
                    uuid: 777,
                    x: 100,
                    parent: {
                        idx: 0,
                        uuid: 777,
                        number: "1",
                        parts: {},
                        version: 0,
                    }
                },
                segments: segments,
                _noAlign: true,
                factory: fakeFactory
            };
            let layout = reduceMeasure(opts).elements;
            expect(layout[0].length).to.equal(2);
            expect(layout[0][0].x$).to.equal(100, "without merging");
            // Occurs after division 1 or 2, so add the end of the measure
            expect(layout[0][1].x$).to.equal(190, "without merging");

            expect(layout[2].length).to.equal(2);
            expect(layout[2][0].x$).to.equal(110, "without merging"); // + 10 for staff
            expect(layout[2][1].x$).to.equal(120, "without merging");

            expect(layout[1].length).to.equal(2);
            expect(layout[1][0].x$).to.equal(110, "without merging");
            expect(layout[1][1].x$).to.equal(130, "without merging");

            // Now test 
            opts._noAlign = false;
            layout = reduceMeasure(opts).elements;
            layout[1].map(l => delete (<any>l).key);
            expect(layout[1]).to.deep.equal(
                [
                    {
                        division: 0,
                        x$: 100,
                        model: null,
                        renderClass: Type.Attributes
                    },
                    {
                        boundingBoxes$: [],
                        division: 0,
                        expandPolicy: ExpandPolicy.After,
                        x$: 110,
                        part: "P1",
                        model: segments[1][0],  // from first voice.
                        renderClass: Type.Chord
                    },
                    {
                        division: 1,
                        expandPolicy: ExpandPolicy.After,
                        x$: 120,
                        model: null,
                        renderClass: Type.Chord
                    },
                    {
                        boundingBoxes$: [],
                        expandPolicy: ExpandPolicy.After,
                        division: 2,
                        x$: 130,
                        part: "P1",
                        model: segments[1][1],
                        renderClass: Type.Chord
                    },
                    {
                        division: 4,
                        x$: 190,
                        model: null,
                        renderClass: Type.Attributes
                    },
                ]
            );
        });
    });
    describe("layoutMeasure", function() {
        it("lays out a case with multiple voices", function() {
            let staffSegments = [
                null,
                createFakeStaffSegment(4, 4, 1)
            ];

            let voiceSegments = [
                null,
                createFakeVoiceSegment(2, 6, 1),
                createFakeVoiceSegment(1, 7, 2)
            ];

            let layout = layoutMeasure({
                document: {
                    __fakeDocument: true
                } as any,
                preview: false,
                print: null,
                memo$: null,
                fixup: null,

                header: <any> {
                    partList: [
                        {
                            _class: "ScorePart",
                            id: "P1"
                        }
                    ]
                },
                attributes: {},
                measure: {
                    idx: 0,
                    number: "1",
                    version: 0,
                    parts: {
                        "P1": {
                            voices: voiceSegments,
                            staves: staffSegments
                        }
                    },
                    uuid: 248,
                    width: NaN
                },
                x: 100,
                line: {
                    barOnLine$: 0,
                    barsOnLine: 0,
                    shortestCount: 42,
                    line: 0,
                    lines: 1
                },
                factory: fakeFactory
            });
            // We've tested this exact case in ISegment.layout$, so we can be
            // a bit soft here.
            expect(layout.paddingBottom).to.deep.equal([, 0]);
            expect(layout.paddingTop).to.deep.equal([, 0]);
            expect(layout.elements[0].length).to.equal(5);
            expect(layout.elements[0][4].x$).to.equal(190);
            expect(layout.elements[0][0].x$).to.equal(100);
            expect(layout.width).to.equal(100);
        });
    });
    describe("approximateWidth", function() {
        it("approximates mid-line width", function() {
            let staffSegments = [
                null,
                createFakeStaffSegment(4, 4, 1)
            ];

            let voiceSegments = [
                null,
                createFakeVoiceSegment(2, 6, 1),
                createFakeVoiceSegment(1, 7, 2)
            ];

            let width = approximateLayout({
                document: {
                    __fakeDocument: true
                } as any,
                print: null,
                preview: false,
                memo$: null,
                fixup: null,

                attributes: {},
                header: <any> {
                    partList: [
                        {
                            _class: "ScorePart",
                            id: "P1"
                        }
                    ]
                },
                measure: {
                    idx: 0,
                    number: "1",
                    version: 0,
                    parts: {
                        "P1": {
                            voices: voiceSegments,
                            staves: staffSegments
                        }
                    },
                    uuid: 1248,
                    width: NaN
                },
                x: 100,
                line: {
                    barOnLine$: 0,
                    barsOnLine: 0,
                    shortestCount: 42,
                    line: 0,
                    lines: 1
                },
                factory: fakeFactory
            }).width;
            // 100 - 10 for attribute 1. See createFakeStaffSegment
            expect(width).to.equal(90);
        });
    });
});
