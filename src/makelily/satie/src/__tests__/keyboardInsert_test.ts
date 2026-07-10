/**
 * @file part of Satie test suite
 *
 * Regression test for inserting a note via the keyboard (ToolNoteEdit's
 * `handleKeyPress`). When the document's `<divisions>` is too coarse to
 * represent the chosen note duration, `calcDivisions` throws a
 * `FractionalDivisionsException`. The mouse path avoids this because the
 * preview pass runs first and the engine's `refresh` catches the exception
 * and bumps `<divisions>`. The keyboard path commits directly with
 * `Patch.createPatch(false, ...)` / `createCanonicalPatch`, so the exception
 * used to escape unhandled out of the React `onKeyPress` handler.
 *
 * The fix bumps `<divisions>` during patch-building (in `fixMetre`) so metre
 * cleanup (`simplifyRests`, which builds a per-integer-division character
 * grid) runs on an integer grid and the resulting bar is correctly filled --
 * matching what the mouse/preview path produces.
 */

import { Count } from "#/musicxml-interfaces";

import { Document, Type } from "../document";
import SongImpl from "../engine_songImpl";
import { FractionalDivisionsException } from "../private_chordUtil";
import { Patch } from "../satie";

const songTemplate = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.0 Partwise//EN"
                                "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise>
  <part-list>
    <score-part id="P1">
      <part-name>Cello</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key>
          <fifths>-3</fifths>
          <mode>minor</mode>
        </key>
        <time symbol="common">
          <beats>4</beats>
          <beat-type>4</beat-type>
        </time>
        <clef>
          <sign>G</sign>
          <line>2</line>
        </clef>
      </attributes>
      <note>
        <rest measure="yes" />
        <duration>4</duration>
        <voice>1</voice>
        <type>whole</type>
      </note>
    </measure>
  </part>
</score-partwise>`;

interface Case {
  name: string;
  note: Count;
  // The divisions the document must be bumped to for `note` to be
  // representable, i.e. lcm(1 * 4, note) / 4.
  expectedDivisions: number;
  // How many voice-division units the inserted note occupies once divisions
  // are bumped (divisions * 4 / note).
  expectedNoteDivCount: number;
}

const cases: Case[] = [
  {
    name: "eighth",
    note: Count.Eighth,
    expectedDivisions: 2,
    expectedNoteDivCount: 1,
  },
  {
    name: "16th",
    note: Count._16th,
    expectedDivisions: 4,
    expectedNoteDivCount: 1,
  },
  {
    name: "32nd",
    note: Count._32nd,
    expectedDivisions: 8,
    expectedNoteDivCount: 1,
  },
];

describe("keyboard note insertion with coarse divisions", function () {
  let song: SongImpl;
  beforeEach((done) => {
    song = new SongImpl({
      baseSrc: songTemplate,
      onError: done,
      onLoaded: () => done(),
    });
    song.run();
  });

  cases.forEach(({ name, note, expectedDivisions, expectedNoteDivCount }) => {
    it(`inserts a ${name} note via insertChord without throwing and fills the bar`, function () {
      const measureUUID = song.getDocument(null).measures[0].uuid;

      // Reproduces ToolNoteEdit.handleKeyPress: a note inserted at the cursor
      // (divisions=1 cannot represent it, so calcDivisions throws
      // FractionalDivisionsException during patch building).
      const buildPatch = (): IAny[] =>
        Patch.createPatch(
          false,
          song.getDocument(null),
          measureUUID,
          "P1",
          (part) =>
            part.voice(1, (voice) =>
              voice
                .at(0)
                .insertChord([
                  (n) =>
                    n
                      .pitch((pitch) => pitch.step("C").octave(5))
                      .rest(undefined)
                      .dots([])
                      .noteType((noteType) => noteType.duration(note))
                      .color("#000000"),
                ])
                .next()
                .addVisualCursor(),
            ),
        );

      let patch: IAny[];
      try {
        patch = buildPatch();
      } catch (err) {
        if (err instanceof FractionalDivisionsException) {
          // The exact failure this test guards against: the exception escapes
          // patch-building (and thus the React onKeyPress handler) unhandled.
          throw new Error(
            `FractionalDivisionsException escaped patch-building ` +
              `(requiredDivisions=${err.requiredDivisions})`,
          );
        }
        throw err;
      }

      // Applying the canonical patch should succeed...
      const expanded = song.createCanonicalPatch({ raw: patch });
      const doc: Document = song.getDocument(expanded);
      const voice = doc.measures[0].parts["P1"].voices[1] as any[];

      // ...<divisions> should have been bumped so the note is representable...
      const attributes = doc.search(
        doc.measures[0].parts["P1"].staves[1],
        0,
        Type.Attributes,
      )[0] as any;
      expect(attributes.divisions).toBe(expectedDivisions);

      // ...the inserted note should have an integer, positive divCount...
      const inserted = voice.find((m: any) => m[0] && !m[0].rest) as any;
      expect(inserted).toBeDefined();
      expect(inserted.divCount).toBe(expectedNoteDivCount);
      expect(inserted.divCount % 1).toBe(0);

      // ...and, crucially, the bar must be FULL: the inserted note plus the
      // rests simplifyRests emits to backfill the remainder must total exactly
      // one bar (beats * beat-type denominator^-1 * divisions). Fractional
      // division counts corrupt simplifyRests' per-division character grid and
      // leave the bar underfull, so this guards against that regression.
      const totalDivCount = voice.reduce(
        (sum: number, m: any) => sum + (m.divCount || 0),
        0,
      );
      const barDivisions = 4 * attributes.divisions; // 4/4
      expect(totalDivCount).toBe(barDivisions);

      // Every model's divCount must be an integer (no fractional leakage).
      voice.forEach((m: any) => {
        expect(m.divCount % 1).toBe(0);
      });
    });
  });
});

// Local type alias to mirror the IAny[] shape used by callers without pulling
// the operations module into this test file.
type IAny = any;
