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
 * @file models/chord/__tests__/metre_test.ts part of Satie test suite
 */

"use strict";

import {Count} from "musicxml-interfaces";

import {expect} from "chai";

import Attributes from "../../attributes";
import Chord from "../../chord";
import {IChord, IModel} from "../../../engine";
import Factory from "../../factory";
import {rhythmicSpellcheck$, calcDivisions} from "../metre";

import {makeCursor} from "../../__tests__/attributes_test";

describe("[metre.ts]", function() {
    describe("rhythmicSpellcheck$", function() {
        it("merges two tied eighth notes", function() {
            let factory = new Factory([Attributes, Chord]);
            let cursor$ = makeCursor(factory, [
                factory.create(IModel.Type.Chord, <IChord> [{
                    pitch: {
                        step: "E",
                        octave: 4
                    },
                    noteType: {
                        duration: Count.Eighth
                    },
                    ties: [{}]
                }]),
                factory.create(IModel.Type.Chord, <IChord> [{
                    pitch: {
                        step: "F",
                        octave: 4
                    },
                    noteType: {
                        duration: Count.Eighth
                    }
                }])
            ]);
            let retcode = rhythmicSpellcheck$(cursor$);
            expect(retcode).to.eq(true, "A change should have occured.");

            expect(cursor$.segment.length).to.equal(1);
            let chord = IChord.fromModel(cursor$.segment[0]);
            expect(calcDivisions(chord, cursor$)).to.equal(60);
            expect(chord.length).to.equal(1);
            expect(chord[0].noteType.duration).to.equal(Count.Quarter);
        });
        it("merges two eighth rests", function() {
            let factory = new Factory([Attributes, Chord]);
            let cursor$ = makeCursor(factory, [
                factory.create(IModel.Type.Chord, <IChord> [{
                    rest: {},
                    noteType: {
                        duration: Count.Eighth
                    }
                }]),
                factory.create(IModel.Type.Chord, <IChord> [{
                    rest: {},
                    noteType: {
                        duration: Count.Eighth
                    }
                }])
            ]);
            let retcode = rhythmicSpellcheck$(cursor$);
            expect(retcode).to.eq(true, "A change should have occured.");

            expect(cursor$.segment.length).to.equal(1);
            let chord = IChord.fromModel(cursor$.segment[0]);
            expect(calcDivisions(chord, cursor$)).to.equal(60);
            expect(chord.length).to.equal(1);
            expect(chord[0].noteType.duration).to.equal(Count.Quarter);
        });
        it("does not merge two eighth notes that are not tied", function() {
            let factory = new Factory([Attributes, Chord]);
            let cursor$ = makeCursor(factory, [
                factory.create(IModel.Type.Chord, <IChord> [{
                    pitch: {
                        step: "E",
                        octave: 4
                    },
                    noteType: {
                        duration: Count.Eighth
                    }
                }]),
                factory.create(IModel.Type.Chord, <IChord> [{
                    pitch: {
                        step: "F",
                        octave: 4
                    },
                    noteType: {
                        duration: Count.Eighth
                    }
                }])
            ]);
            let retcode = rhythmicSpellcheck$(cursor$);
            expect(retcode).to.eq(false, "A change should not have occured.");

            expect(cursor$.segment.length).to.equal(2);
            let chord = IChord.fromModel(cursor$.segment[0]);
            expect(calcDivisions(chord, cursor$)).to.equal(30);
            expect(chord.length).to.equal(1);
            expect(chord[0].noteType.duration).to.equal(Count.Eighth);
        });
        it("does not merge accross boundries", function() {
            let factory = new Factory([Attributes, Chord]);
            let cursor$ = makeCursor(factory, [
                factory.create(IModel.Type.Chord, <IChord> [{
                    pitch: {
                        step: "E",
                        octave: 4
                    },
                    noteType: {
                        duration: Count.Quarter
                    },
                    dots: [{}],
                }]),
                factory.create(IModel.Type.Chord, <IChord> [{
                    pitch: {
                        step: "F",
                        octave: 4
                    },
                    noteType: {
                        duration: Count.Eighth
                    },
                }]),
                factory.create(IModel.Type.Chord, <IChord> [{
                    pitch: {
                        step: "F",
                        octave: 4
                    },
                    noteType: {
                        duration: Count.Eighth
                    },
                }])
            ]);
            let retcode = rhythmicSpellcheck$(cursor$);
            expect(retcode).to.eq(false, "A change should not have occured.");

            expect(cursor$.segment.length).to.equal(3);
        });
    });
});
