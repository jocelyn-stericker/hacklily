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

import {Attributes} from "musicxml-interfaces";

import AttributesModel from "../implAttributes_attributesModel";

import {expect} from "chai";

import {ISegment, IModel, Type} from "../document";

import {ValidationCursor, LayoutCursor} from "../private_cursor";

import Factory from "../engine_factory";

export function makeCursor(factory: Factory, models: ISegment): ValidationCursor {
    models.part = "P1";
    let v: ValidationCursor = {
        const: () => v,
        document: {
            __fakeDocument: true
        } as any,
        fixup: null,
        dangerouslyPatchWithoutValidation: null,
        patch: null,
        advance: null,

        segmentInstance: <any> models,
        segmentPosition: 0,

        staffAttributes: <any> {
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
        staffAccidentals: {},
        staffIdx: 0,
        measureInstance: {
            uuid: 100,
            nonControlling: false,
            idx: 0,
            number: "1",
            implicit: false,
            parts: {
                "P1": {
                    staves: [
                        null,
                        {
                        }
                    ],
                    voices: null,
                }
            }
        } as any,
        measureIsLast: true,
        print: null,
        header: <any> {
            partList: [
                {
                    _class: "ScorePart",
                    id: "P1"
                }
            ]
        },

        segmentDivision: 0,

        factory: factory,
        preview: false,
        singleLineMode: false,
    };
    return v;
}

function FakeChord(constructors: { [key: number]: any }) {
    constructors[Type.Chord] = function() {
        // pass
    };
}

describe("[attributes.ts]", function() {
    describe("AttributesModel", function() {
        let factory = new Factory([AttributesModel, FakeChord]);
        let attributes: Attributes & IModel;
        let segment: ISegment;
        it("can be created", function() {
            attributes = factory.create(Type.Attributes);
            expect(!!attributes).to.be.true;
            // Divisions is usually set by the engine
            attributes.divisions = 100;
            segment = [attributes] as any;

            let cursor = makeCursor(factory, segment);
            cursor.staffAttributes = <any> {};
            attributes.refresh(cursor);
        });
        it("lays out properly when at start of song", function() {
            let cursor = makeCursor(factory, segment);
            cursor.staffAttributes = {} as any;
            const lCursor: LayoutCursor = {...cursor,
                measureX: 0,
                lineShortest: Number.MAX_VALUE,
                lineBarOnLine: 0,
                lineTotalBarsOnLine: 1,
                lineIndex: 0,
                lineCount: 1,
                segmentX: 100,
                lineMaxPaddingTopByStaff: [],
                lineMaxPaddingBottomByStaff: [],
            };
            let layout = attributes.getLayout(lCursor) as AttributesModel.IAttributesLayout;
            expect(!!layout.keySignature).to.be.true;
            expect(!!layout.time).to.be.true;
            expect(!!layout.clef).to.be.true;
            expect(layout.tsSpacing).to.be.gt(0);
            expect(layout.clefSpacing).to.be.gt(0);
            expect(layout.ksSpacing).to.be.gt(0);

            expect(layout.x).to.be.lt(lCursor.segmentX);
            let expectedChange = layout.clefSpacing + layout.tsSpacing + layout.ksSpacing;
            expect(lCursor.segmentX - layout.x).to.equal(expectedChange);
        });
    });
});
