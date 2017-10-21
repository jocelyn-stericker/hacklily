import {BarStyleType, Count, MxmlAccidental} from "musicxml-interfaces";
import {expect} from "chai";
import {find} from "lodash";

import {Type} from "../document";
import SongImpl from "../engine_songImpl";
import {IChord} from "../private_chordUtil";
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
    <measure number="2">
      <note>
        <rest measure="yes" />
        <duration>4</duration>
        <voice>1</voice>
        <type>whole</type>
      </note>
    </measure>
    <measure number="3">
      <note>
        <rest measure="yes" />
        <duration>4</duration>
        <voice>1</voice>
        <type>whole</type>
      </note>
    </measure>
  </part>
</score-partwise>`;

describe("patches (1)", function() {
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

    it("can append a bar, and adjust barlines accordingly, and this can be undone", function(done) {
        const patch = Patch.createPatch(false, song.getDocument(null),
            document => document
                .insertMeasure(3, measure => measure
                    .part("P1", part => part
                        .voice(1, voice => voice
                            .at(0)
                            .insertChord([
                                note => note
                                    .rest({})
                                    .staff(1)
                                    .noteType(type => type
                                        .duration(Count.Whole)
                                    )
                            ])
                        )
                    )
              )
        );
        let thirdMeasureUUID = song.getDocument(null).measures[2].uuid;

        // new measure
        expect(patch[0].p).to.deep.equal(["measures", 3]);
        let newMeasureUUID = patch[0].li.uuid;
        expect(newMeasureUUID).to.be.a("number");

        // new note
        expect(patch[1].p).to.deep.equal([newMeasureUUID, "parts", "P1", "voices", 1, 0]);
        expect(patch[1].li[0]._class).to.equal("Note");
        expect(patch[1].ld).to.equal(undefined);

        // previously final barline
        expect(patch[2].p).to.deep.equal([thirdMeasureUUID, "parts", "P1", "staves", 1, 3,
                                         "barStyle", "data"]);
        expect(patch[2].oi).to.equal(BarStyleType.Regular);
        expect(patch[2].od).to.equal(BarStyleType.LightHeavy);

        // No other patches
        expect(patch.length).to.equal(3);

        const expandedPatch = song.createCanonicalPatch({raw: patch});

        // check state of document
        const patchedDocument = song.getDocument(expandedPatch);
        expect(patchedDocument.measures.length).to.equal(4);
        expect(patchedDocument.measures[3].parts["P1"].voices[1][0].divCount).to.equal(4);
        expect(patchedDocument.modelHasType(patchedDocument.measures[3].parts["P1"].staves[1][3],
            Type.Barline)).to.be.true;

        // Does not change previous patch.
        expect(patch.length).to.equal(3);

        let barStylePatch = find((expandedPatch as any).content, (p: any) => p.li && p.li._class === "Barline");
        expect(barStylePatch).to.deep.equal({
            p: [newMeasureUUID, "parts", "P1", "staves", 1, 2], // May eventually be 3?
            li: {
                _class: "Barline",
                barStyle: {
                    data: BarStyleType.LightHeavy,
                    // may eventually include color?
                },
            },
        });

        // Try undoing everything
        const newPatch = song.createCanonicalPatch(null);
        expect((newPatch as any).content.length).to.equal(0);
        expect(song.getDocument(newPatch).measures.length).to.equal(3);
        const barline = song.getDocument(newPatch).measures[2].parts["P1"].staves[1][3];
        expect((barline as any)._class).to.equal("Barline");
        expect((barline as any).barStyle.data === BarStyleType.LightHeavy);

        // changed barline
        done();
    });
    it("can replace a rest with a shorter note", function(done) {
        const measureUUID = song.getDocument(null).measures[0].uuid;

        const patch = Patch.createPatch(false, song.getDocument(null), measureUUID, "P1", part => part
            .voice(1, voice => voice
                .at(0)
                .note(0, note => note
                    .pitch(pitch => pitch
                          .step("C")
                          .octave(5)
                          .alter(1))
                    .dots([])
                    .noteType(noteType => noteType
                        .duration(Count.Quarter)
                    )
                    .accidental(accidental => accidental
                        .accidental(MxmlAccidental.Sharp)
                    )
                    .color("#cecece")
                )
            )
        );

        song.createCanonicalPatch({raw: patch});

        // Try undoing this, making sure the first note is now a rest.
        const newPatch = song.createCanonicalPatch(null);
        expect((song.getDocument(newPatch).measures[0].parts["P1"].voices[1][0] as any as IChord)[0].rest).
            to.deep.equal({
                displayOctave: undefined,
                displayStep: undefined,
                measure: true,
            });

        // changed barline
        done();
    });
});
