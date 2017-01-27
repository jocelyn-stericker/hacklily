import {Count, Note} from "musicxml-interfaces";
import {expect} from "chai";

import {Type} from "../document";
import SongImpl from "../engine_songImpl";
import {Patch} from "../satie";

const songTemplate = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.0 Partwise//EN"
                                "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise>
  <movement-title>Satie Sandbox</movement-title>
  <identification>
    <miscellaneous>
      <miscellaneous-field name="description">
        A test song
      </miscellaneous-field>
    </miscellaneous>
  </identification>
  <part-list>
    <score-part id="P1">
      <part-name>Cello</part-name>
    </score-part>
  </part-list>
  <!--=========================================================-->
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

function getDivisionBreakdown(song: SongImpl, patches: {isPatches: boolean}) {
  const doc = song.getDocument(patches);
  expect(doc.measures.length).to.equal(1, "there should only be one measure");

  return doc
    .measures[0]
    .parts["P1"]
    .voices[1]
    .filter(n => doc.modelHasType(n, Type.Chord))
    .map(n => n.divCount + ((n as any as Note[])[0].rest ? "R" : "N"))
    .filter(n => n);
}

function insertNote(song: SongImpl, patches: {isPatches: boolean}, idx: number, count: Count) {
  const doc = song.getDocument(patches);
  const measure1 = doc.measures[0].uuid;
  let patch = Patch.createPatch(false, doc,
      document => document
        .measure(measure1, measure => measure
          .part("P1", part => part
            .voice(1, voice => voice
              .at(idx)
              .insertChord([note => note.pitch(p => p.octave(2).step("C")).noteType(t => t.duration(count))])
            )
          )
        )
  );
  return song.createCanonicalPatch(patches, {raw: patch});
}

describe("patch metre", function() {
    let song: SongImpl;
    beforeEach((done) => {
        song = new SongImpl({
            baseSrc: songTemplate,

            onError: done,
            onLoaded: () => {
                done();
            },
        });
        song.run();
    });

    it("4/4, whole note", function() {
        let patch = insertNote(song, null, 0, Count.Whole);
        expect(getDivisionBreakdown(song, patch)).to.deep.equal(["4N"]);
    });

    it("4/4, half notes", function() {
        let patch = insertNote(song, null, 0, Count.Half);
        expect(getDivisionBreakdown(song, patch)).to.deep.equal(["2N", "2R"]);

        patch = insertNote(song, patch, 0, Count.Half);
        expect(getDivisionBreakdown(song, patch)).to.deep.equal(["2N", "2N"]);
    });

    it("4/4, quarter notes", function() {
        let patch = insertNote(song, null, 0, Count.Quarter);
        expect(getDivisionBreakdown(song, patch)).to.deep.equal(["1N", "1R", "2R"]);

        patch = insertNote(song, patch, 1, Count.Quarter);
        expect(getDivisionBreakdown(song, patch)).to.deep.equal(["1N", "1N", "2R"]);

        patch = insertNote(song, patch, 2, Count.Quarter);
        expect(getDivisionBreakdown(song, patch)).to.deep.equal(["1N", "1N", "1N", "1R"]);

        patch = insertNote(song, patch, 3, Count.Quarter);
        expect(getDivisionBreakdown(song, patch)).to.deep.equal(["1N", "1N", "1N", "1N"]);
    });

    it("4/4, eighth notes", function() {
        let patch = insertNote(song, null, 0, Count.Eighth);
        expect(getDivisionBreakdown(song, patch)).to.deep.equal(["0.5N", "0.5R", "1R", "2R"]);

        patch = insertNote(song, patch, 1, Count.Eighth);
        expect(getDivisionBreakdown(song, patch)).to.deep.equal(["0.5N", "0.5N", "1R", "2R"]);

        patch = insertNote(song, patch, 2, Count.Eighth);
        expect(getDivisionBreakdown(song, patch)).to.deep.equal(["0.5N", "0.5N", "0.5N", "0.5R", "2R"]);

        patch = insertNote(song, patch, 3, Count.Eighth);
        expect(getDivisionBreakdown(song, patch)).to.deep.equal(["0.5N", "0.5N", "0.5N", "0.5N", "2R"]);

        patch = insertNote(song, patch, 4, Count.Eighth);
        expect(getDivisionBreakdown(song, patch)).to.deep.equal(["0.5N", "0.5N", "0.5N", "0.5N", "0.5N", "0.5R", "1R"]);

        patch = insertNote(song, patch, 5, Count.Eighth);
        expect(getDivisionBreakdown(song, patch)).to.deep.equal(["0.5N", "0.5N", "0.5N", "0.5N", "0.5N", "0.5N", "1R"]);

        patch = insertNote(song, patch, 6, Count.Eighth);
        expect(getDivisionBreakdown(song, patch)).to.deep.equal(["0.5N", "0.5N", "0.5N", "0.5N", "0.5N", "0.5N", "0.5N", "0.5R"]);

        patch = insertNote(song, patch, 6, Count.Eighth);
        expect(getDivisionBreakdown(song, patch)).to.deep.equal(["0.5N", "0.5N", "0.5N", "0.5N", "0.5N", "0.5N", "0.5N", "0.5N"]);
    });
});
