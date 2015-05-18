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

import Engine                   = require("../engine");

import MusicXML                 = require("musicxml-interfaces");
import _                        = require("lodash");
import chai                     = require("chai");

var expect                      = chai.expect;

import ETestUtil                = require("../engine/__tests__/etestutil");

describe("[engine.ts]", function() {
    describe("Options.ILineBounds.calculate", function() {
        it("works", function() {
            var spec1: MusicXML.Print = {
                measureNumbering: {
                    data: "system"
                },
                partNameDisplay: null,
                newSystem: null,
                newPage: null,
                blankPage: null,
                measureLayout: null,
                partAbbreviationDisplay: null,
                staffSpacing: null,
                staffLayouts: null,
                pageNumber: "1",
                systemLayout: {
                    systemMargins: {
                        leftMargin: 0,
                        rightMargin: 0
                    }
                },
                pageLayout: {
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
                }
            };
            expect(Engine.Options.ILineBounds.calculate(spec1, 1)).to.deep.equal({
                left: 11,
                right: 1000 - 12,
                systemLayout: {
                    systemMargins: {
                        leftMargin: 0,
                        rightMargin: 0
                    }
                }
            });
            expect(Engine.Options.ILineBounds.calculate(spec1, 2)).to.deep.equal({
                left: 21,
                right: 1000 - 22,
                systemLayout: {
                    systemMargins: {
                        leftMargin: 0,
                        rightMargin: 0
                    }
                }
            });
        });
    });
    describe("validate$", function() {
        it("creates attributes and barline if missing", function() {
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
                searchHere: (models: Engine.IModel[], idx: number, modelType: Engine.IModel.Type):
                        Engine.IModel[] => {
                    let model = models[idx];
                    if (model.divCount === 0) {
                        if (modelType === Engine.IModel.Type.Attributes) {
                            return [model];
                        } else {
                            return [];
                        }
                    }
                    if (modelType === Engine.IModel.Type.Chord) {
                        return [model];
                    } else {
                        return [];
                    }
                },
                fromSpec: (model: any): Engine.IModel => {
                    throw "Not implemented";
                }
            };

            var memo$ = Engine.Options.ILinesLayoutMemo.create(NaN);
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
                page$: 0,
                modelFactory: createAttributesChordFactory,
                postProcessors: []
            };

            Engine.validate$(contextOptions, memo$);

            expect(calledCount).to.equal(3);
        });
    });
});
