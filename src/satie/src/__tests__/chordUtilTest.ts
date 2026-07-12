// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

/* eslint-disable no-shadow */

/**
 * @file part of Satie test suite
 */

import type { Note } from "#/musicxml-interfaces";
import { Count } from "#/musicxml-interfaces";
import type { INoteBuilder } from "#/musicxml-interfaces/builders";
import { buildClef, buildNote } from "#/musicxml-interfaces/builders";

import {
  hasAccidental,
  lineForClef,
  linesForClef,
  heightDeterminingLine,
  startingLine,
  onLedger,
  ledgerLines,
} from "../private_chordUtil";
import { makeCursor } from "./attributes_test";

describe("[engine/ichord.ts]", function () {
  describe("hasAccidental", function () {
    it("works with rests", function () {
      const notes: Note[] = [
        {
          rest: {},
        },
      ];
      const cursor = makeCursor(null, <any>[notes]);
      expect(hasAccidental(notes, cursor)).toEqual(false);
    });
  });

  const treble = buildClef((clef) => clef.sign("G").line(2));

  const withRoot = (root: string, octave: number) => (note: INoteBuilder) =>
    note
      .pitch((pitch) => pitch.step(root).octave(octave))
      .duration(1)
      .noteType((noteType) => noteType.duration(Count.Quarter));

  const noteC = buildNote(withRoot("C", 4));
  const noteD = buildNote(withRoot("D", 4));
  const noteG = buildNote(withRoot("G", 5));
  const noteA = buildNote(withRoot("A", 5));
  const noteCHigher = buildNote(withRoot("C", 6));

  const noteR = buildNote((note) =>
    note.rest({}).noteType((noteType) => noteType.duration(Count.Half)),
  );

  describe("lineForClef", function () {
    it("handles a null note", function () {
      expect(lineForClef(null, treble)).toEqual(3);
    });
    it("throws on a null clef", function () {
      expect(() => lineForClef(noteC, null)).toThrow();
      expect(() => lineForClef(null, null)).toThrow();
    });
    it("calculates middle C", function () {
      const bass = buildClef((clef) => clef.sign("F").line(4));

      expect(lineForClef(noteC, treble)).toEqual(0);
      expect(lineForClef(noteC, bass)).toEqual(6);
    });
    it("calculates whole rest", function () {
      const note = buildNote((note) =>
        note.rest({}).noteType((noteType) => noteType.duration(Count.Whole)),
      );

      const clef2 = buildClef((clef) => clef.sign("C").line(2));

      expect(lineForClef(note, treble)).toEqual(4);
      expect(lineForClef(note, clef2)).toEqual(4);
    });
    it("calculates half rest", function () {
      const clef = buildClef((clef) => clef.sign("G").line(2));

      expect(lineForClef(noteR, clef)).toEqual(3);
    });
  });
  describe("linesForClef", function () {
    it("doesn't choke on empty chord", function () {
      expect(linesForClef([], treble)).toEqual([]);
    });
    it("throws on null clef", function () {
      const note1 = buildNote((note) =>
        note.rest({}).noteType((noteType) => noteType.duration(Count.Half)),
      );
      expect(() => linesForClef([], null)).toThrow();
      expect(() => linesForClef([note1], null)).toThrow();
    });
    it("seems to work", function () {
      const note1 = buildNote((note) =>
        note.rest({}).noteType((noteType) => noteType.duration(Count.Half)),
      );

      expect(linesForClef([note1, noteC], treble)).toEqual([3, 0]);
    });
  });
  describe("heightDeterminingLine", function () {
    it("calculates single line", function () {
      const note1 = buildNote((note) =>
        note.rest({}).noteType((noteType) => noteType.duration(Count.Half)),
      );
      expect(heightDeterminingLine([note1], 1, treble)).toEqual(3);
      expect(heightDeterminingLine([note1], -1, treble)).toEqual(3);
    });
    it("calculates inner line", function () {
      const note2 = buildNote((note) =>
        note
          .pitch((pitch) => pitch.step("C").octave(5))
          .duration(1)
          .noteType((noteType) => noteType.duration(Count.Quarter)),
      );

      expect(heightDeterminingLine([noteC, note2], 1 /* Up */, treble)).toEqual(
        3.5,
      );
      expect(heightDeterminingLine([note2, noteC], 1 /* Up */, treble)).toEqual(
        3.5,
      );

      expect(
        heightDeterminingLine([noteC, note2], -1 /* Down */, treble),
      ).toEqual(0);
      expect(
        heightDeterminingLine([note2, noteC], -1 /* Down */, treble),
      ).toEqual(0);
    });
    it("throws on invalid direction", function () {
      expect(() => heightDeterminingLine([noteC], <any>"1", treble)).toThrow();
      expect(() => heightDeterminingLine([noteC], NaN, treble)).toThrow();
      expect(() => heightDeterminingLine([noteC], 0.5, treble)).toThrow();
      expect(() => heightDeterminingLine([noteC], 0, treble)).toThrow();
    });
  });
  describe("startingLine", function () {
    it("calculates outer line for 3 notes", function () {
      const note2 = buildNote((note) =>
        note
          .pitch((pitch) => pitch.step("C").octave(5))
          .duration(1)
          .noteType((noteType) => noteType.duration(Count.Quarter)),
      );

      const note3 = buildNote((note) =>
        note
          .pitch((pitch) => pitch.step("G").octave(4))
          .duration(1)
          .noteType((noteType) => noteType.duration(Count.Quarter)),
      );

      expect(
        startingLine([noteC, note2, note3], -1 /* Down */, treble),
      ).toEqual(3.5);
      expect(
        startingLine([note2, noteC, note3], -1 /* Down */, treble),
      ).toEqual(3.5);

      expect(startingLine([noteC, note3, note2], 1 /* Up */, treble)).toEqual(
        0,
      );
      expect(startingLine([noteC, note3, note2], 1 /* Up */, treble)).toEqual(
        0,
      );
    });
  });
  describe("onLedger", function () {
    it("determines middle C to have a ledger", function () {
      expect(onLedger(noteC, treble)).toBe(true);
    });
    it("determines middle D to not have a ledger", function () {
      expect(onLedger(noteD, treble)).toBe(false);
    });
    it("determines high G to not have a ledger", function () {
      expect(onLedger(noteG, treble)).toBe(false);
    });
    it("determines high A to have a ledger", function () {
      expect(onLedger(noteA, treble)).toBe(true);
    });
    it("determintes rests to not have ledgers", function () {
      expect(onLedger(noteR, treble)).toBe(false);
      const noteROdd = buildNote((note) =>
        note
          .rest((rest) => rest.displayStep("A").displayOctave(5))
          .noteType((type) => type.duration(Count.Half)),
      );
      expect(onLedger(noteROdd, treble)).toBe(false);
    });
  });
  describe("ledgerLines", function () {
    it("throws if clef is missing", function () {
      expect(() => ledgerLines([noteC], null)).toThrow();
    });
    it("calculates valid answers for single notes", function () {
      expect(ledgerLines([noteC], treble)).toEqual([0]);
      expect(ledgerLines([noteD], treble)).toEqual([]);
      expect(ledgerLines([noteG], treble)).toEqual([]);
      expect(ledgerLines([noteA], treble)).toEqual([6]);
    });
    it("does not double count", function () {
      expect(ledgerLines([noteA, noteCHigher], treble)).toEqual([6, 7]);
    });
  });
});
