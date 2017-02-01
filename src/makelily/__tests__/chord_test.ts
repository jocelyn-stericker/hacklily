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

import Chord from "../implChord_chordModel";

import {Note, Count} from "musicxml-interfaces";
import {expect} from "chai";

import {IModel, Type} from "../document";

import {IFactory} from "../private_factory";
import {IAttributesSnapshot} from "../private_attributesSnapshot";
import {ValidationCursor, LayoutCursor} from "../private_cursor";

import Factory from "../engine_factory";

import AttributesExports from "../implAttributes_attributesModel";

function getAttributes(): IAttributesSnapshot {
    return <any> {
        measureStyle: {},
        divisions: 6,
        time: {
            beats: ["4"],
            beatTypes: [4],
            senzaMisura: null
        },
        clef: {
            clefOctaveChange: null,
            sign: "G",
            line: 2
        }
    };
}

function getCursor(factory: IFactory, model: IModel): ValidationCursor {
    let attributes = getAttributes();
    let segment = <any> [model];
    segment.part = "P1";
    segment.ownerType = "voice";
    let v: ValidationCursor = {
        const: () => v,
        document: {
            __fakeDocument: true
        } as any,
        fixup: null,
        dangerouslyPatchWithoutValidation: () => null,
        patch: () => null,
        advance: null,

        segmentInstance: segment,
        segmentPosition: 0,
        print: null,
        header: null,

        staffAttributes: attributes,
        staffAccidentals: {},
        staffIdx: 0,
        measureInstance: {
            idx: 0,
            number: "1",
            implicit: false,
            version: 0,
            nonControlling: false,
            uuid: 1,
        } as any,
        measureIsLast: true,
        segmentDivision: 0,

        factory: factory,
        preview: false,
    };
    return v;
}

describe("[chord.ts]", function() {
    describe("ChordModel", function() {
        let factory = new Factory([AttributesExports, Chord]);
        it("can be created from scratch", function() {
            let chord = factory.create(Type.Chord);
            expect(!!chord).to.be.true;
            expect(chord.length).to.eq(0);
        });
        it("can be correctly created from a simple spec", function() {
            let chord = factory.fromSpec({
                _class: "Note",
                timeModification: {
                    actualNotes: 3,
                    normalNotes: 2
                },
                duration: 600, // Playback duration. Should be ignored in these tests.
                noteType: {
                    duration: Count.Eighth
                },
                pitch: {
                    step: "C",
                    octave: 4,
                    alter: 1
                }
            } as Note);
            let cursor = getCursor(factory, chord);
            chord.refresh(cursor);

            cursor = getCursor(factory, chord);
            expect(cursor.segmentDivision).to.eq(0);
            const lCursor: LayoutCursor = {...cursor,
                measureX: 100,
                lineShortest: 1,
                lineBarOnLine: 0,
                lineTotalBarsOnLine: 1,
                lineIndex: 0,
                lineCount: 1,
                segmentX: 100,
                lineMaxPaddingTopByStaff: [],
                lineMaxPaddingBottomByStaff: [],
            };
            chord.getLayout(lCursor);
            expect(cursor.segmentDivision).to.eq(0, "layout must not affect cursor division");
            let xml = (<any>chord).inspect();
            expect(xml).to.contain("<step>C</step>");
            expect(xml).to.contain("<alter>1</alter>");
            expect(xml).to.contain("<octave>4</octave>");
            expect(xml).to.not.contain("<chord");
            expect(xml).to.contain("<duration>600</duration>", "Maintains playback data");
        });
        it("can be a chord generated from specs", function() {
            let chord = factory.fromSpec({
                _class: "Note",
                timeModification: {
                    actualNotes: 3,
                    normalNotes: 2
                },
                noteType: {
                    duration: Count.Eighth
                },
                pitch: {
                    step: "C",
                    octave: 4,
                    alter: 1
                }
            });
            chord.push({
                _class: "Note",
                timeModification: {
                    actualNotes: 3,
                    normalNotes: 2
                },
                noteType: {
                    duration: Count.Eighth
                },
                pitch: {
                    step: "E",
                    octave: 4
                }
            } as Note);
            let cursor = getCursor(factory, chord);
            chord.refresh(cursor);
            cursor = getCursor(factory, chord);
            const lCursor: LayoutCursor = {...cursor,
                measureX: 100,
                lineShortest: 1,
                lineBarOnLine: 0,
                lineTotalBarsOnLine: 1,
                lineIndex: 0,
                lineCount: 1,
                segmentX: 100,
                lineMaxPaddingTopByStaff: [],
                lineMaxPaddingBottomByStaff: [],
            };
            chord.getLayout(lCursor);
            // let chordDuration = chordFromModel(chord)[0].duration;
            // expect(chordDuration).to.eq(2, "Duration wasn't specified so should be set here.");
            // XXX: implement a proper patcher for tests
        });
    });
});
