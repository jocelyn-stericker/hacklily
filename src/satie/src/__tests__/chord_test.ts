// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

/**
 * @file part of Satie test suite
 */

import type { Note } from "#/musicxml-interfaces";
import { Count } from "#/musicxml-interfaces";

import type { IModel } from "../document";
import { Type } from "../document";
import Factory from "../engine_factory";
import AttributesExports from "../implAttributes_attributesModel";
import Chord from "../implChord_chordModel";
import type { IAttributesSnapshot } from "../private_attributesSnapshot";
import type { ValidationCursor, LayoutCursor } from "../private_cursor";
import type { IFactory } from "../private_factory";

function getAttributes(): IAttributesSnapshot {
  return <any>{
    measureStyle: {},
    divisions: 6,
    time: {
      beats: ["4"],
      beatTypes: [4],
      senzaMisura: null,
    },
    clef: {
      clefOctaveChange: null,
      sign: "G",
      line: 2,
    },
  };
}

function getCursor(factory: IFactory, model: IModel): ValidationCursor {
  const attributes = getAttributes();
  const segment = <any>[model];
  segment.part = "P1";
  segment.ownerType = "voice";
  const v: ValidationCursor = {
    const: () => v,
    document: {
      __fakeDocument: true,
    } as any,
    fixup: () => null,
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
    singleLineMode: false,
  };
  return v;
}

describe("[chord.ts]", function () {
  describe("ChordModel", function () {
    const factory = new Factory([AttributesExports, Chord]);
    it("can be created from scratch", function () {
      const chord = factory.create(Type.Chord);
      expect(!!chord).toBe(true);
      expect(chord.length).toEqual(0);
    });
    it("can be correctly created from a simple spec", function () {
      const chord = factory.fromSpec({
        _class: "Note",
        timeModification: {
          actualNotes: 3,
          normalNotes: 2,
        },
        duration: 600, // Playback duration. Should be ignored in these tests.
        noteType: {
          duration: Count.Eighth,
        },
        pitch: {
          step: "C",
          octave: 4,
          alter: 1,
        },
        dots: [],
      } as Note);
      let cursor = getCursor(factory, chord);
      chord.divCount = 2;
      chord.refresh(cursor);

      cursor = getCursor(factory, chord);
      expect(cursor.segmentDivision).toEqual(0);
      const lCursor: LayoutCursor = {
        // eslint-disable-next-line @typescript-eslint/no-misused-spread
        ...cursor,
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
      expect(cursor.segmentDivision).toEqual(0); // layout must not affect cursor division
      const xml = (<any>chord).inspect();
      expect(xml).toContain("<step>C</step>");
      expect(xml).toContain("<alter>1</alter>");
      expect(xml).toContain("<octave>4</octave>");
      expect(xml).not.toContain("<chord");
      expect(xml).toContain("<duration>600</duration>"); // Maintains playback data
    });
    it("can be a chord generated from specs", function () {
      const chord = factory.fromSpec({
        _class: "Note",
        timeModification: {
          actualNotes: 3,
          normalNotes: 2,
        },
        noteType: {
          duration: Count.Eighth,
        },
        pitch: {
          step: "C",
          octave: 4,
          alter: 1,
        },
        dots: [],
      });
      chord.push({
        _class: "Note",
        timeModification: {
          actualNotes: 3,
          normalNotes: 2,
        },
        noteType: {
          duration: Count.Eighth,
        },
        pitch: {
          step: "E",
          octave: 4,
        },
        dots: [],
      });
      let cursor = getCursor(factory, chord);
      chord.divCount = 2;
      chord.refresh(cursor);
      cursor = getCursor(factory, chord);
      const lCursor: LayoutCursor = {
        // eslint-disable-next-line @typescript-eslint/no-misused-spread
        ...cursor,
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
      // expect(chordDuration).toEqual(2, "Duration wasn't specified so should be set here.");
      // XXX: implement a proper patcher for tests
    });
  });
});
