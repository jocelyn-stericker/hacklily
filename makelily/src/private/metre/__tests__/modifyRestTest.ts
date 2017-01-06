// import {expect} from "chai";
// import {Count} from "musicxml-interfaces";
// import {simplifyRests} from "../modifyRest";
// import Song from "../../../engine/song";
// import Type from "../../../document/types";

// const songTemplate = `<?xml version="1.0" encoding="UTF-8"?>
// <!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.0 Partwise//EN"
//                                 "http://www.musicxml.org/dtds/partwise.dtd">
// <score-partwise>
//   <movement-title>Satie Sandbox</movement-title>
//   <identification>
//     <miscellaneous>
//       <miscellaneous-field name="description">
//         A test song
//       </miscellaneous-field>
//     </miscellaneous>
//   </identification>
//   <part-list>
//     <score-part id="P1">
//       <part-name>Cello</part-name>
//     </score-part>
//   </part-list>
//   <!--=========================================================-->
//   <part id="P1">
//     <measure number="1">
//       <attributes>
//         <divisions>1</divisions>
//         <key>
//           <fifths>-3</fifths>
//           <mode>minor</mode>
//         </key>
//         <time symbol="common">
//           <beats>4</beats>
//           <beat-type>4</beat-type>
//         </time>
//         <clef>
//           <sign>G</sign>
//           <line>2</line>
//         </clef>
//       </attributes>
//       <note>
//         <rest measure="yes" />
//         <duration>4</duration>
//         <voice>1</voice>
//         <type>whole</type>
//       </note>
//     </measure>
//     <measure number="2">
//       <note>
//         <rest measure="yes" />
//         <duration>4</duration>
//         <voice>1</voice>
//         <type>whole</type>
//       </note>
//     </measure>
//     <measure number="3">
//       <note>
//         <rest measure="yes" />
//         <duration>4</duration>
//         <voice>1</voice>
//         <type>whole</type>
//       </note>
//     </measure>
//   </part>
// </score-partwise>`;

// let song: Song;
// describe("modifyRest", function() {
//     beforeEach((done) => {
//         song = new Song({
//             baseSrc: songTemplate,

//             onError: done,
//             onLoaded: () => {
//                 done();
//             },
//         });
//         song.run();
//     });

//     it("returns valid patches", function() {
//         const doc = song.getDocument(null);
//         const voice = doc.measures[0].parts["P1"].voices[1];
//         const attributes = doc.measures[0].parts["P1"].staves[1]
//             .filter(el => doc.modelHasType(el, Type.Attributes))[0];
//         if (!doc.modelHasType(attributes, Type.Attributes)) {
//             throw new Error("TypeScript is broken");
//         }
//         const attributesSnapshot = attributes._snapshot as any;
//         let p = simplifyRests(voice, doc, attributesSnapshot).patches;

//         expect(p.length).to.equal(3);

//         expect(p[0].p).to.deep.equal([1]);
//         expect(p[0].ld).to.be.ok;
//         expect(p[0].ld[0]._class).to.equal("Note");
//         expect(p[0].li).to.not.be.ok;

//         expect(p[1].p).to.deep.equal([1]);
//         expect(p[1].ld).to.not.be.ok;
//         expect(p[1].li).to.be.ok;
//         expect(p[1].li[0]._class).to.equal("Note");
//         expect(p[1].li[0].rest).to.be.ok;
//         expect(p[1].li._class).to.equal("Chord");

//         expect(p[2].p).to.deep.equal([2]);
//         expect(p[2].ld).to.not.be.ok;
//         expect(p[2].li).to.be.ok;
//         expect(p[2].li._class).to.equal("Chord");
//         expect(p[2].li[0].rest).to.be.ok;
//     });

//     it("handles the middle of the bar", function() {
//         const doc = song.getDocument(null);
//         const voice = doc.measures[0].parts["P1"].voices[1];
//         const attributes = doc.measures[0].parts["P1"].staves[1]
//             .filter(el => doc.modelHasType(el, Type.Attributes))[0];
//         if (!doc.modelHasType(attributes, Type.Attributes)) {
//             throw new Error("TypeScript is broken");
//         }
//         const attributesSnapshot = attributes._snapshot as any;
//         let p = simplifyRests(voice, doc, attributesSnapshot).patches;

//         expect(p.length).to.equal(2);

//         expect(p[0].p).to.deep.equal([0, 0, "noteType", "duration"]);
//         expect(p[0].od).to.equal(Count.Whole);
//         expect(p[0].oi).to.equal(Count.Quarter);

//         expect(p[1].p).to.deep.equal([3]);
//         expect(p[1].ld).to.not.be.ok;
//         expect(p[1].li).to.be.ok;
//         expect(p[1].li[0]._class).to.equal("Note");
//         expect(p[1].li[0].rest).to.be.ok;
//         expect(p[1].li[0].noteType.duration).to.equal(Count.Quarter);
//         expect(p[1].li._class).to.equal("Chord");
//     });
// });
