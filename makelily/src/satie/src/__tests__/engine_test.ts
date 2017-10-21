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

import {Print, OddEvenBoth} from "musicxml-interfaces";

import {map} from "lodash";
import {expect} from "chai";

import {IModel, ILayout, Type} from "../document";

import {IFactory} from "../private_factory";
import {calculateLineBounds} from "../private_lineBounds";
import {ILayoutOptions} from "../private_layoutOptions";
import {ValidationCursor, LayoutCursor} from "../private_cursor";

import {createFakeStaffSegment, createFakeVoiceSegment} from "./etestutil";
import validate from "../engine_processors_validate";

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
            expect(calculateLineBounds(spec1, 1, {millimeters: 10, tenths: 40})).to.deep.equal({
                left: 11,
                right: 1000 - 12,
                systemLayout: {
                    systemMargins: {
                        leftMargin: 0,
                        rightMargin: 0
                    }
                }
            });
            expect(calculateLineBounds(spec1, 2, {millimeters: 10, tenths: 40})).to.deep.equal({
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
    describe("validate", function() {
        it("creates attributes and barline if missing", function() {
            let calledCount = 0;

            let createAttributesChordFactory: IFactory = {
                create: (modelType: Type): IModel => {
                    ++calledCount;
                    return {
                        divCount: 0,
                        staffIdx: 1,

                        refresh: (cursor: ValidationCursor) => { /* pass */ },
                        getLayout: function(cursor: LayoutCursor): ILayout {
                            throw "not reached";
                        },
                        calcWidth: () => 0,
                    };
                },
                modelHasType(model: IModel, ...modelTypes: Type[]): boolean {
                    let modelType = modelTypes[0];
                    if (model.divCount === 0) {
                        return modelType === Type.Attributes;
                    } else if ("length" in model) {
                        return modelType === Type.Chord;
                    }
                    return modelType === Type.Spacer;
                },
                search: (models: IModel[], idx: number, modelType: Type):
                        IModel[] => {
                    let model = models[idx];
                    if (model.divCount === 0) {
                        if (modelType === Type.Attributes) {
                            return [model];
                        } else {
                            return [];
                        }
                    }
                    if (modelType === Type.Chord) {
                        return [model];
                    } else {
                        return [];
                    }
                },
                fromSpec: (model: any): IModel => {
                    return createAttributesChordFactory.create(Type[model._class] as any);
                }
            } as any;

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
                document: {
                    modelHasType: createAttributesChordFactory.modelHasType,
                    __fakeDocument: true
                } as any,
                preview: false,
                fixup: null,
                lineCount: 0,
                lineIndex: 0,
                singleLineMode: false,

                attributes: null,
                measures: map(segments, function(segment, idx) {
                    return {
                        idx: idx,
                        uuid: 91015 + idx,
                        number: String(idx + 1),
                        version: 0,
                        parts: <{[key: string]: any}> {
                            "P1": {
                                voices: segment.voices,
                                staves: segment.staves
                            }
                        }
                    };
                }),
                header: null,
                print: {
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
                modelFactory: createAttributesChordFactory,
                preprocessors: [],
                postprocessors: []
            };
            contextOptions.document.measures = contextOptions.measures;

            validate(contextOptions);

            expect(calledCount).to.equal(2);
        });
    });
});
