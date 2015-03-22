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

import Engine           = require("../engine");

import MusicXML         = require("musicxml-interfaces");
import _                = require("lodash");
import chai             = require("chai");

var expect              = chai.expect;

import ETestUtil        = require("../engine/__tests__/etestutil");

describe("[engine.ts]", function() {
    describe("layoutMeasure", function() {
        it("lays out a case with multiple voices", function() {
            var staffSegments = [
                null,
                ETestUtil.createFakeStaffSegment(4, 4, 1)
            ];

            var voiceSegments = [
                null,
                ETestUtil.createFakeVoiceSegment(2, 6, 1),
                ETestUtil.createFakeVoiceSegment(1, 7, 2)
            ];

            var layout = Engine.layoutMeasure({
                header:         null,
                attributes:     null,
                maxX:           1000,
                minX:           100,
                measure: {
                    idx:        0,
                    number:     "1",
                    parts: {
                        "P1": {
                            voices:     voiceSegments,
                            staves:     staffSegments
                        }
                    },
                    uuid:       248,
                    width:      NaN
                },
                prevByStaff:    [],
                x:              100,
                line:           null,
                factory:        ETestUtil.fakeAttributeChordFactory
            });
            // We've tested this exact case in ISegment.layout$, so we can be
            // a bit soft here.
            expect(layout.paddingBottom).to.equal(0);
            expect(layout.paddingTop).to.equal(0);
            expect(layout.elements[0].length).to.equal(5);
            expect(layout.elements[0][4].x$).to.equal(190);
            expect(layout.elements[0][0].x$).to.equal(100);
            expect(layout.width).to.equal(100);
        });
    });
    describe("approximateWidth", function() {
        it("approximates mid-line width", function() {
            var staffSegments = [
                null,
                ETestUtil.createFakeStaffSegment(4, 4, 1)
            ];

            var voiceSegments = [
                null,
                ETestUtil.createFakeVoiceSegment(2, 6, 1),
                ETestUtil.createFakeVoiceSegment(1, 7, 2)
            ];

            var width = Engine.approximateWidth({
                attributes:     null,
                maxX:           1000,
                minX:           100,
                header:         null,
                measure: {
                    idx:        0,
                    number:     "1",
                    parts: {
                        "P1": {
                            voices: voiceSegments,
                            staves: staffSegments
                        }
                    },
                    uuid:       1248,
                    width:      NaN
                },
                prevByStaff:    [],
                x:              100,
                line:           null,
                factory:        ETestUtil.fakeAttributeChordFactory
            });
            expect(width).to.equal(90); // 100 - 10 for attribute 1. See ETestUtil.createFakeStaffSegment
        });
    });
    describe("Options.ILineBounds.calculate", function() {
        var spec1: MusicXML.PageLayout = {
            pageHeight: 1000,
            pageWidth: 1000,
            pageMargins: [
                {
                    bottomMargin: 10,
                    leftMargin: 11,
                    rightMargin: 12,
                    topMargin: 13,
                    type: MusicXML.OddEvenBoth.Odd
                },
                {
                    bottomMargin: 10,
                    leftMargin: 21,
                    rightMargin: 22,
                    topMargin: 13,
                    type: MusicXML.OddEvenBoth.Even
                }
            ]
        };
        expect(Engine.Options.ILineBounds.calculate(spec1, 1)).to.deep.equal({
            left: 11,
            right: 1000 - 12
        });
        expect(Engine.Options.ILineBounds.calculate(spec1, 2)).to.deep.equal({
            left: 21,
            right: 1000 - 22
        });
    });
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

            var layouts = _.map(segments, (seg, idx) => Engine.layoutMeasure({
                attributes:     null,
                maxX:           1000,
                minX:           0,
                measure: {
                    idx:        idx,
                    number:     (idx + 1) + "",
                    parts: {
                        "P1": {
                            voices: seg.voices,
                            staves: seg.staves
                        }
                    },
                    uuid:       1248 + idx,
                    width:      NaN
                },
                header:         null,
                prevByStaff:    [],
                x:              0,
                line:           null,
                factory:        ETestUtil.fakeAttributeChordFactory
            }));

            var padding = 12;

            var justified = Engine.justify(
                {
                    attributes: null,
                    finalLine: true,
                    measures: new Array(2), // TODO: if justify uses measures, this will have to be given a proper value.
                    header: null,
                    page$: 0,
                    pageLayout$: {
                        pageHeight: 1000,
                        pageWidth: 1000,
                        pageMargins: [{
                            leftMargin: padding,
                            rightMargin: padding,
                            bottomMargin: padding,
                            topMargin: padding,
                            type: MusicXML.OddEvenBoth.Both
                        }]
                    },
                    modelFactory: ETestUtil.fakeAttributeChordFactory
                },
                {
                    left: 12,
                    right: 1000 - 12
                },
                layouts);

            expect(justified[0].elements[0][0].x$).to.be.closeTo(layouts[0].elements[0][0].x$ + padding, 0.05);
            expect(justified[0].elements[0][2].x$).to.be.closeTo(75.2, 0.1);
            expect(justified[0].width).to.be.closeTo(justified[0].elements[0][4].x$ - justified[0].elements[0][0].x$ + 10, 0.01);
            _.forEach(justified, function(just, idx) {
                expect(just.width).to.not.equal(layouts[idx].width);
                _.forEach(just.elements, function(elArr, jdx) {
                    _.forEach(elArr, function(el, kdx) {
                        expect(el.x$).to.not.equal(layouts[idx].elements[jdx][kdx].x$);
                    });
                });
            });
        });
    });
    describe("layout$", function() {
        it("can lay out two lines", function() {
            var memo$ = Engine.Options.ILinesLayoutMemo.create();
            var padding = 20;

            var segments = _.times(10, function() {
                return {
                    staves: [null, ETestUtil.createFakeStaffSegment(4, 4, 1)],
                    voices: [
                        null,
                        ETestUtil.createFakeVoiceSegment(2, 6, 1),
                        ETestUtil.createFakeVoiceSegment(1, 7, 2)
                    ]
                };
            });

            var contextOptions: Engine.Options.ILayoutOptions = {
                attributes: null,
                measures: _.map(segments, function(segment, idx) {
                    return {
                        idx:             idx,
                        uuid:            91015 + idx,
                        number:          (idx + 1) + "",
                        parts: <{[key: string]: any}> {
                            "P1": {
                                voices: segment.voices,
                                staves: segment.staves
                            }
                        }
                    };
                }),
                header: null,
                pageLayout$: {
                    pageHeight: 1000,
                    pageWidth: 1000,
                    pageMargins: [{
                        leftMargin: padding,
                        rightMargin: padding,
                        bottomMargin: padding,
                        topMargin: padding,
                        type: MusicXML.OddEvenBoth.Both
                    }]
                },
                page$: 0,
                modelFactory: ETestUtil.fakeAttributeChordFactory
            };

            var result = Engine.layout$(contextOptions, memo$);
            expect(result.length).to.equal(2);
            var l1bars = result[0].measureLayouts;
            var l1EndEls = l1bars[l1bars.length - 1].elements[0];

            expect(result[0].measureLayouts[0].elements[0][0].x$).to.be.closeTo(result[1].measureLayouts[0].elements[0][0].x$, 0.05);
            expect(l1EndEls[l1EndEls.length - 1].x$).to.equal(1000 - 20 - 10);
        });
    });
    describe("validate$", function() {
        it("creates attributes if missing", function() {
            var calledCount = 0;

            var createAttributesChordFactory: Engine.IModel.IFactory = {
                create: (modelType: Engine.IModel.Type): Engine.IModel => {
                    ++calledCount;
                    return {
                        divCount: 0,
                        staffIdx: 1,
                        frozenness: Engine.IModel.FrozenLevel.Warm,
                        modelDidLoad$: (segment$: Engine.Measure.ISegment) => { /* pass */ },
                        validate$: (cursor$: Engine.ICursor) => { /* pass */ },
                        fields: [],
                        layout: function(cursor$: Engine.ICursor): Engine.IModel.ILayout {
                            throw "not reached";
                        }
                    };
                },
                modelHasType: (model: Engine.IModel, modelType: Engine.IModel.Type): boolean => {
                    if (model.divCount === 0) {
                        return modelType === Engine.IModel.Type.Attributes;
                    }
                    return modelType === Engine.IModel.Type.Chord;
                },
                timestepHasType: (models: Engine.IModel[], idx: number,
                        modelType: Engine.IModel.Type): boolean => {
                    let model = models[idx];
                    if (model.divCount === 0) {
                        return modelType === Engine.IModel.Type.Attributes;
                    }
                    return modelType === Engine.IModel.Type.Chord;
                },
                fromSpec: (model: any): Engine.IModel => {
                    throw "Not implemented";
                }
            };

            var memo$ = Engine.Options.ILinesLayoutMemo.create();
            var padding = 20;

            var segments = [{
                staves: [null, ETestUtil.createFakeStaffSegment(4, 4, 1)],
                voices: [
                    null,
                    ETestUtil.createFakeVoiceSegment(2, 6, 1),
                    ETestUtil.createFakeVoiceSegment(1, 7, 2)
                ]
            }];

            var contextOptions: Engine.Options.ILayoutOptions = {
                attributes: null,
                measures: _.map(segments, function(segment, idx) {
                    return {
                        idx:             idx,
                        uuid:            91015 + idx,
                        number:          (idx + 1) + "",
                        parts: <{[key: string]: any}> {
                            "P1": {
                                voices: segment.voices,
                                staves: segment.staves
                            }
                        }
                    };
                }),
                header: null,
                pageLayout$: {
                    pageHeight: 1000,
                    pageWidth: 1000,
                    pageMargins: [{
                        leftMargin: padding,
                        rightMargin: padding,
                        bottomMargin: padding,
                        topMargin: padding,
                        type: MusicXML.OddEvenBoth.Both
                    }]
                },
                page$: 0,
                modelFactory: createAttributesChordFactory
            };

            Engine.validate$(contextOptions, memo$);

            expect(calledCount).to.equal(1);
        });
    });
});
