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

import {Print, OddEvenBoth} from "musicxml-interfaces";
import {map} from "lodash";
import {expect} from "chai";

import {validate,ILayoutOptions, ICursor, ILineBounds, ILinesLayoutMemo, IModel, ISegment}
        from "../engine";
import {createFakeStaffSegment, createFakeVoiceSegment} from "../engine/__tests__/etestutil";

describe("[engine.ts]", function() {
    describe("Options.ILineBounds.calculate", function() {
        it("works", function() {
            let spec1: Print = {
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
                            type: OddEvenBoth.Odd
                        },
                        {
                            bottomMargin: 10,
                            leftMargin: 21,
                            rightMargin: 22,
                            topMargin: 13,
                            type: OddEvenBoth.Even
                        }
                    ]
                }
            };
            expect(ILineBounds.calculate(spec1, 1)).to.deep.equal({
                left: 11,
                right: 1000 - 12,
                systemLayout: {
                    systemMargins: {
                        leftMargin: 0,
                        rightMargin: 0
                    }
                }
            });
            expect(ILineBounds.calculate(spec1, 2)).to.deep.equal({
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
            let calledCount = 0;

            let createAttributesChordFactory: IModel.IFactory = {
                create: (modelType: IModel.Type): IModel => {
                    ++calledCount;
                    return {
                        divCount: 0,
                        staffIdx: 1,
                        frozenness: IModel.FrozenLevel.Warm,
                        modelDidLoad$: (segment$: ISegment) => { /* pass */ },
                        validate$: (cursor$: ICursor) => { /* pass */ },
                        layout: function(cursor$: ICursor): IModel.ILayout {
                            throw "not reached";
                        }
                    };
                },
                modelHasType: (model: IModel, modelType: IModel.Type): boolean => {
                    if (model.divCount === 0) {
                        return modelType === IModel.Type.Attributes;
                    }
                    return modelType === IModel.Type.Chord;
                },
                search: (models: IModel[], idx: number, modelType: IModel.Type):
                        IModel[] => {
                    let model = models[idx];
                    if (model.divCount === 0) {
                        if (modelType === IModel.Type.Attributes) {
                            return [model];
                        } else {
                            return [];
                        }
                    }
                    if (modelType === IModel.Type.Chord) {
                        return [model];
                    } else {
                        return [];
                    }
                },
                fromSpec: (model: any): IModel => {
                    throw "Not implemented";
                }
            };

            let memo$ = ILinesLayoutMemo.create(NaN);
            let padding = 20;

            let segments = [{
                staves: [null, createFakeStaffSegment(4, 4, 1)],
                voices: [
                    null,
                    createFakeVoiceSegment(2, 6, 1),
                    createFakeVoiceSegment(1, 7, 2)
                ]
            }];

            let contextOptions: ILayoutOptions = {
                attributes: null,
                measures: map(segments, function(segment, idx) {
                    return {
                        idx: idx,
                        uuid: 91015 + idx,
                        number: String(idx + 1),
                        parts: <{[key: string]: any}> {
                            "P1": {
                                voices: segment.voices,
                                staves: segment.staves
                            }
                        }
                    };
                }),
                header: null,
                print$: {
                    measureNumbering: null,
                    blankPage: null,
                    partNameDisplay: null,
                    newSystem: null,
                    newPage: null,
                    measureLayout: null,
                    partAbbreviationDisplay: null,
                    pageNumber: null,
                    staffLayouts: null,
                    staffSpacing: null,
                    systemLayout: null,
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
                page$: 0,
                modelFactory: createAttributesChordFactory,
                preprocessors: [],
                postprocessors: []
            };

            validate(contextOptions, memo$);

            expect(calledCount).to.equal(3);
        });
    });
});
