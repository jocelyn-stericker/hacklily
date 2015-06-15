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

import IChord from "../ichord";

import MusicXML = require("musicxml-interfaces");
import chai = require("chai");
let expect = chai.expect;

import {makeCursor} from "../../models/__tests__/attributes_test";

describe("[engine/ichord.ts]", function() {
    describe("hasAccidental", function() {
        it("works with rests", function() {
            let notes: MusicXML.Note[] = [{
                rest: {}
            }];
            let cursor = makeCursor(null, <any> [notes]);
            expect(IChord.hasAccidental(notes, cursor)).to.eq(false);
        });
    });

    const treble = MusicXML.parse.clef(`<clef>
        <sign>G</sign>
        <line>2</line>
    </clef>`);

    const noteC = MusicXML.parse.note(`<note>
        <pitch>
            <step>C</step>
            <octave>4</octave>
        </pitch>
        <duration>1</duration>
        <type>quarter</type>
    </note>`);

    const noteD = MusicXML.parse.note(`<note>
        <pitch>
            <step>D</step>
            <octave>4</octave>
        </pitch>
        <duration>1</duration>
        <type>quarter</type>
    </note>`);

    const noteG = MusicXML.parse.note(`<note>
        <pitch>
            <step>G</step>
            <octave>5</octave>
        </pitch>
        <duration>1</duration>
        <type>quarter</type>
    </note>`);

    const noteA = MusicXML.parse.note(`<note>
        <pitch>
            <step>A</step>
            <octave>5</octave>
        </pitch>
        <duration>1</duration>
        <type>quarter</type>
    </note>`);

    const noteCHigher = MusicXML.parse.note(`<note>
        <pitch>
            <step>C</step>
            <octave>6</octave>
        </pitch>
        <duration>1</duration>
        <type>quarter</type>
    </note>`);

    const noteR = MusicXML.parse.note(`<note>
        <rest />
        <type>half</type>
    </note>`);

    describe("lineForClef", function() {
        it("handles a null note", function() {
            expect(IChord.lineForClef(null, treble)).to.equal(3);
        });
        it("throws on a null clef", function() {
            expect(() => IChord.lineForClef(noteC, null)).to.throw();
            expect(() => IChord.lineForClef(null, null)).to.throw();
        });
        it("calculates middle C", function() {

            let bass = MusicXML.parse.clef(`<clef>
                <sign>F</sign>
                <line>4</line>
            </clef>`);

            expect(IChord.lineForClef(noteC, treble)).to.equal(0);
            expect(IChord.lineForClef(noteC, bass)).to.equal(6);
        });
        it("calculates whole rest", function() {
            let note = MusicXML.parse.note(`<note>
                <rest />
                <type>whole</type>
            </note>`);

            let clef2 = MusicXML.parse.clef(`<clef>
                <sign>C</sign>
                <line>2</line>
            </clef>`);

            expect(IChord.lineForClef(note, treble)).to.equal(4);
            expect(IChord.lineForClef(note, clef2)).to.equal(4);
        });
        it("calculates half rest", function() {
            let clef = MusicXML.parse.clef(`<clef>
                <sign>G</sign>
                <line>2</line>
            </clef>`);

            expect(IChord.lineForClef(noteR, clef)).to.equal(3);
        });
    });
    describe("linesForClef", function() {
        it("doesn't choke on empty chord", function() {
            expect(IChord.linesForClef([], treble)).to.deep.equal([]);
        });
        it ("throws on null clef", function() {
            let note1 = MusicXML.parse.note(`<note>
                <rest />
                <type>half</type>
            </note>`);
            expect(() => IChord.linesForClef([], null)).to.throw();
            expect(() => IChord.linesForClef([note1], null)).to.throw();
        });
        it("seems to work", function() {
            let note1 = MusicXML.parse.note(`<note>
                <rest />
                <type>half</type>
            </note>`);

            expect(IChord.linesForClef([note1, noteC], treble)).to.deep.equal([3, 0]);
        });
    });
    describe("heightDeterminingLine", function() {
        it("calculates single line", function() {
            let note1 = MusicXML.parse.note(`<note>
                <rest />
                <type>half</type>
            </note>`);
            expect(IChord.heightDeterminingLine([note1], 1, treble)).to.deep.equal(3);
            expect(IChord.heightDeterminingLine([note1], -1, treble)).to.deep.equal(3);
        });
        it("calculates inner line", function() {
            let note2 = MusicXML.parse.note(`<note>
                <pitch>
                    <step>C</step>
                    <octave>5</octave>
                </pitch>
                <duration>1</duration>
                <type>quarter</type>
            </note>`);

            expect(IChord.heightDeterminingLine([noteC, note2], 1 /* Up */, treble)).to.equal(3.5);
            expect(IChord.heightDeterminingLine([note2, noteC], 1 /* Up */, treble)).to.equal(3.5);

            expect(IChord.heightDeterminingLine([noteC, note2], -1 /* Down */, treble)).to.equal(0);
            expect(IChord.heightDeterminingLine([note2, noteC], -1 /* Down */, treble)).to.equal(0);
        });
        it("throws on invalid direction", function() {
            expect(() => IChord.heightDeterminingLine([noteC], <any> "1", treble)).to.throw();
            expect(() => IChord.heightDeterminingLine([noteC], NaN, treble)).to.throw();
            expect(() => IChord.heightDeterminingLine([noteC], 0.5, treble)).to.throw();
            expect(() => IChord.heightDeterminingLine([noteC], 0, treble)).to.throw();
        });
    });
    describe("startingLine", function() {
        it("calculates outer line for 3 notes", function() {
            let note2 = MusicXML.parse.note(`<note>
                <pitch>
                    <step>C</step>
                    <octave>5</octave>
                </pitch>
                <duration>1</duration>
                <type>quarter</type>
            </note>`);

            let note3 = MusicXML.parse.note(`<note>
                <pitch>
                    <step>G</step>
                    <octave>4</octave>
                </pitch>
                <duration>1</duration>
                <type>quarter</type>
            </note>`);

            expect(IChord.startingLine([noteC, note2, note3], -1 /* Down */, treble)).to.equal(3.5);
            expect(IChord.startingLine([note2, noteC, note3], -1 /* Down */, treble)).to.equal(3.5);

            expect(IChord.startingLine([noteC, note3, note2], 1 /* Up */, treble)).to.equal(0);
            expect(IChord.startingLine([noteC, note3, note2], 1 /* Up */, treble)).to.equal(0);
        });
    });
    describe("onLedger", function() {
        it("determines middle C to have a ledger", function() {
            expect(IChord.onLedger(noteC, treble)).to.be.true;
        });
        it("determines middle D to not have a ledger", function() {
            expect(IChord.onLedger(noteD, treble)).to.be.false;
        });
        it("determines high G to not have a ledger", function() {
            expect(IChord.onLedger(noteG, treble)).to.be.false;
        });
        it("determines high A to have a ledger", function() {
            expect(IChord.onLedger(noteA, treble)).to.be.true;
        });
        it("determintes rests to not have ledgers", function() {
            expect(IChord.onLedger(noteR, treble)).to.be.false;
            const noteROdd = MusicXML.parse.note(`<note>
                <rest>
                    <display-step>A</display-step>
                    <display-octave>5</display-octave>
                </rest>
                <type>half</type>
            </note>`);
            expect(IChord.onLedger(noteROdd, treble)).to.be.false;
        });
    });
    describe("ledgerLines", function() {
        it("throws if clef is missing", function() {
            expect(() => IChord.ledgerLines([noteC], null)).to.throw();
        });
        it("calculates valid answers for single notes", function() {
            expect(IChord.ledgerLines([noteC], treble)).to.deep.equal([0]);
            expect(IChord.ledgerLines([noteD], treble)).to.deep.equal([]);
            expect(IChord.ledgerLines([noteG], treble)).to.deep.equal([]);
            expect(IChord.ledgerLines([noteA], treble)).to.deep.equal([6]);
        });
        it("does not double count", function() {
            expect(IChord.ledgerLines([noteA, noteCHigher], treble)).to.deep.equal([6, 7]);
        });
    });
});
