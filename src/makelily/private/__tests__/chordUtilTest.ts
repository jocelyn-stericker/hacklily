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

import {hasAccidental, lineForClef, linesForClef, heightDeterminingLine,
    startingLine, onLedger, ledgerLines} from "../chordUtil";

import {Note, Count} from "musicxml-interfaces";
import {buildClef, buildNote, INoteBuilder} from "musicxml-interfaces/builders";
import {expect} from "chai";

import {makeCursor} from "../../implAttributes/__tests__/attributes_test";

describe("[engine/ichord.ts]", function() {
    describe("hasAccidental", function() {
        it("works with rests", function() {
            let notes: Note[] = [{
                rest: {}
            }];
            let cursor = makeCursor(null, <any> [notes]);
            expect(hasAccidental(notes, cursor)).to.eq(false);
        });
    });

    const treble = buildClef(clef => clef
        .sign("G")
        .line(2));

    const withRoot = (root: string, octave: number) => (note: INoteBuilder) => note
        .pitch(pitch => pitch
            .step(root)
            .octave(octave))
        .duration(1)
        .noteType(noteType => noteType
            .duration(Count.Quarter));

    const noteC = buildNote(withRoot("C", 4));
    const noteD = buildNote(withRoot("D", 4));
    const noteG = buildNote(withRoot("G", 5));
    const noteA = buildNote(withRoot("A", 5));
    const noteCHigher = buildNote(withRoot("C", 6));

    const noteR = buildNote(note => note
        .rest({})
        .noteType(noteType => noteType
            .duration(Count.Half)));

    describe("lineForClef", function() {
        it("handles a null note", function() {
            expect(lineForClef(null, treble)).to.equal(3);
        });
        it("throws on a null clef", function() {
            expect(() => lineForClef(noteC, null)).to.throw();
            expect(() => lineForClef(null, null)).to.throw();
        });
        it("calculates middle C", function() {

            let bass = buildClef(clef => clef
                .sign("F")
                .line(4));

            expect(lineForClef(noteC, treble)).to.equal(0);
            expect(lineForClef(noteC, bass)).to.equal(6);
        });
        it("calculates whole rest", function() {
            let note = buildNote(note => note
                .rest({})
                .noteType(noteType => noteType
                    .duration(Count.Whole)));

            let clef2 = buildClef(clef => clef
                .sign("C")
                .line(2));

            expect(lineForClef(note, treble)).to.equal(4);
            expect(lineForClef(note, clef2)).to.equal(4);
        });
        it("calculates half rest", function() {
            let clef = buildClef(clef => clef
                .sign("G")
                .line(2));

            expect(lineForClef(noteR, clef)).to.equal(3);
        });
    });
    describe("linesForClef", function() {
        it("doesn't choke on empty chord", function() {
            expect(linesForClef([], treble)).to.deep.equal([]);
        });
        it ("throws on null clef", function() {
            const note1 = buildNote(note => note
                .rest({})
                .noteType(noteType => noteType
                    .duration(Count.Half)));
            expect(() => linesForClef([], null)).to.throw();
            expect(() => linesForClef([note1], null)).to.throw();
        });
        it("seems to work", function() {
            const note1 = buildNote(note => note
                .rest({})
                .noteType(noteType => noteType
                    .duration(Count.Half)));

            expect(linesForClef([note1, noteC], treble)).to.deep.equal([3, 0]);
        });
    });
    describe("heightDeterminingLine", function() {
        it("calculates single line", function() {
            const note1 = buildNote(note => note
                .rest({})
                .noteType(noteType => noteType
                    .duration(Count.Half)));
            expect(heightDeterminingLine([note1], 1, treble)).to.deep.equal(3);
            expect(heightDeterminingLine([note1], -1, treble)).to.deep.equal(3);
        });
        it("calculates inner line", function() {
            const note2 = buildNote(note => note
                .pitch(pitch => pitch
                    .step("C")
                    .octave(5))
                .duration(1)
                .noteType(noteType => noteType
                    .duration(Count.Quarter)));

            expect(heightDeterminingLine([noteC, note2], 1 /* Up */, treble)).to.equal(3.5);
            expect(heightDeterminingLine([note2, noteC], 1 /* Up */, treble)).to.equal(3.5);

            expect(heightDeterminingLine([noteC, note2], -1 /* Down */, treble)).to.equal(0);
            expect(heightDeterminingLine([note2, noteC], -1 /* Down */, treble)).to.equal(0);
        });
        it("throws on invalid direction", function() {
            expect(() => heightDeterminingLine([noteC], <any> "1", treble)).to.throw();
            expect(() => heightDeterminingLine([noteC], NaN, treble)).to.throw();
            expect(() => heightDeterminingLine([noteC], 0.5, treble)).to.throw();
            expect(() => heightDeterminingLine([noteC], 0, treble)).to.throw();
        });
    });
    describe("startingLine", function() {
        it("calculates outer line for 3 notes", function() {
            const note2 = buildNote(note => note
                .pitch(pitch => pitch
                    .step("C")
                    .octave(5))
                .duration(1)
                .noteType(noteType => noteType
                    .duration(Count.Quarter)));

            const note3 = buildNote(note => note
                .pitch(pitch => pitch
                    .step("G")
                    .octave(4))
                .duration(1)
                .noteType(noteType => noteType
                    .duration(Count.Quarter)));

            expect(startingLine([noteC, note2, note3], -1 /* Down */, treble)).to.equal(3.5);
            expect(startingLine([note2, noteC, note3], -1 /* Down */, treble)).to.equal(3.5);

            expect(startingLine([noteC, note3, note2], 1 /* Up */, treble)).to.equal(0);
            expect(startingLine([noteC, note3, note2], 1 /* Up */, treble)).to.equal(0);
        });
    });
    describe("onLedger", function() {
        it("determines middle C to have a ledger", function() {
            expect(onLedger(noteC, treble)).to.be.true;
        });
        it("determines middle D to not have a ledger", function() {
            expect(onLedger(noteD, treble)).to.be.false;
        });
        it("determines high G to not have a ledger", function() {
            expect(onLedger(noteG, treble)).to.be.false;
        });
        it("determines high A to have a ledger", function() {
            expect(onLedger(noteA, treble)).to.be.true;
        });
        it("determintes rests to not have ledgers", function() {
            expect(onLedger(noteR, treble)).to.be.false;
            const noteROdd = buildNote(note => note
                .rest(rest => rest
                    .displayStep("A")
                    .displayOctave(5))
                .noteType(type => type
                    .duration(Count.Half)));
            expect(onLedger(noteROdd, treble)).to.be.false;
        });
    });
    describe("ledgerLines", function() {
        it("throws if clef is missing", function() {
            expect(() => ledgerLines([noteC], null)).to.throw();
        });
        it("calculates valid answers for single notes", function() {
            expect(ledgerLines([noteC], treble)).to.deep.equal([0]);
            expect(ledgerLines([noteD], treble)).to.deep.equal([]);
            expect(ledgerLines([noteG], treble)).to.deep.equal([]);
            expect(ledgerLines([noteA], treble)).to.deep.equal([6]);
        });
        it("does not double count", function() {
            expect(ledgerLines([noteA, noteCHigher], treble)).to.deep.equal([6, 7]);
        });
    });
});
