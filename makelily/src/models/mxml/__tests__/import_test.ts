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

import MusicXML     = require("musicxml-interfaces");
import _            = require("lodash");
import chai         = require("chai");

import Engine       = require("../../engine");
import Factory      = require("../../factory");
import MXMLImport   = require("../import");

import Attributes   = require("../../attributes");
import Barline      = require("../../barline");
import Chord        = require("../../chord");
import Direction    = require("../../direction");
import Print        = require("../../print");
import Sound        = require("../../sound");
import Spacer       = require("../../spacer");

var expect          = chai.expect;

describe("[mxml/import.ts]", function() {
    describe("_extractMXMLHeader", function() {
        it("can parse all header properties", function() {
            var mxmljson = MusicXML.parse(helloWorldXML);
            var header = MXMLImport._extractMXMLHeader(mxmljson);

            expect(header).to.be.an.instanceof(Engine.ScoreHeader);

            expect(header.credits.length).to.eq(5);
            expect(header.credits[4].page).to.eq(2);
            expect(header.credits[0].creditTypes).to.deep.equal(["title"]);
            expect(header.credits[1].creditWords).to.deep.equal([{
                // Specified
                words: "Song Composer",

                defaultX: 1124,
                defaultY: 1362,
                fontSize: "12",
                justify: MusicXML.LeftCenterRight.Right,
                valign: MusicXML.TopMiddleBottomBaseline.Top,

                // Not specified
                color: "#000000",
                dir: MusicXML.DirectionMode.Ltr,
                enclosure: MusicXML.EnclosureShape.None,
                fontFamily: "",
                fontStyle: MusicXML.NormalItalic.Normal,
                fontWeight: MusicXML.NormalBold.Normal,
                halign: MusicXML.LeftCenterRight.Right, // Agrees with justify
                letterSpacing: "normal",
                lineHeight: "normal",
                lineThrough: 0,
                overline: 0,
                relativeX: null,
                relativeY: null,
                rotation: 0,
                underline: 0
            }]);
            // Check that halign still follows justify
            expect(header.credits[0].creditWords[0].halign).to.eq(MusicXML.LeftCenterRight.Center);

            expect(header.identification.creators.length).to.eq(3);
            expect(header.identification.creators[0].type).to.eq("composer");
            expect(header.identification.creators[0].creator).to.eq("Song Composer");
            expect(header.identification.creators[1].type).to.eq("lyricist");
            expect(header.identification.creators[1].creator).to.eq("Song Lyricist");
            expect(header.identification.creators[2].type).to.eq("arranger");
            expect(header.identification.creators[2].creator).to.eq("Song Arranger");
            expect(header.identification.encoding).to.deep.equal({
                encoders: [],
                encodingDate: {
                    day: 10,
                    month: 3,
                    year: 2015
                },
                encodingDescriptions: [],
                softwares: [ // TODO: musicxml-interfaces: shouldn't be plural
                    "Song Software 1",
                    "Song Software 2"
                ],
                supports: {
                    accidental: {
                        element: "accidental",
                        attribute: "",
                        type: "yes",
                        value: ""
                    },
                    print_newPage: {
                        element: "print",
                        attribute: "new-page",
                        type: "yes",
                        value: "yes"
                    }
                }
            });

            expect(header.movementTitle).to.eq("Song Title");
            expect(header.partList).to.deep.equal({
                scoreParts: [{
                    id: "P1",
                    partName: {
                        // Specified
                        printObject: false,
                        partName: "MusicXML Part",

                        // Not specified
                        color: "#000000",
                        defaultX: null,
                        defaultY: null,
                        fontFamily: "",
                        fontSize: "",
                        fontStyle: MusicXML.NormalItalic.Normal,
                        fontWeight: MusicXML.NormalBold.Normal,
                        justify: MusicXML.LeftCenterRight.Left,
                        relativeX: null,
                        relativeY: null
                    },
                    scoreInstruments: [{
                        id: "P1-I1",
                        instrumentName: "SmartMusic SoftSynth 1",

                        // Not specified
                        instrumentAbbreviation: "",
                        instrumentSound: "",
                        solo: null,
                        virtualInstrument: null,
                        ensemble: ""
                    }],
                    midiInstruments: [{
                        midiChannel: 1,
                        midiBank: 15489,
                        midiProgram: 1,
                        volume: 80,
                        pan: 0,
                        id: "P1-I1",

                        // Not specified
                        elevation: null,
                        midiName: "",
                        midiUnpitched: null
                    }],

                    // Not specified
                    groups: [],
                    identification: null,
                    midiDevices: [],
                    partNameDisplay: null,
                    partAbbreviation: null,
                    partAbbreviationDisplay: null
                }],

                // Not specified
                partGroups: []
            });

            expect(!("parts" in header), "Check _extractHeader");

            // Extensions
            expect(header.composer).to.eq("Song Composer");
            expect(header.title).to.eq("Song Title");
        });
    });
    describe("_extractMXMLPartsAndMeasures", function() {
        it("parses a basic single-part song", function() {
            var factory = new Factory([Attributes, Chord, Print, Sound, Barline]);
                // does not need spacer

            var mxmljson = MusicXML.parse(helloWorldXML);
            var partsAndMeasures = MXMLImport._extractMXMLPartsAndMeasures(mxmljson, factory);
            expect(partsAndMeasures.measures.length).to.eq(1);
            expect(partsAndMeasures.measures[0].parts["P1"].staves[1].length).to.eq(4);
            expect(partsAndMeasures.measures[0].parts["P1"].staves[1][0].divCount).to.eq(0);
            expect(partsAndMeasures.measures[0].parts["P1"].staves[1][1].divCount).to.eq(0);
            expect(partsAndMeasures.measures[0].parts["P1"].staves[1][2].divCount).to.eq(8);
            expect(partsAndMeasures.measures[0].parts["P1"].staves[1][3].divCount).to.eq(0);
            expect(partsAndMeasures.measures[0].parts["P1"].voices[1].length).to.eq(1);
        });
        it("parses multi-voice, multi-staff songs with backup", function() {
            var factory = new Factory([Attributes, Direction, Chord, Print, Sound, Barline, Spacer]);

            var mxmljson = MusicXML.parse(lily43eXML);
            var partsAndMeasures = MXMLImport._extractMXMLPartsAndMeasures(mxmljson, factory);
            expect(partsAndMeasures.measures.length).to.eq(4);
            expect(partsAndMeasures.parts).to.eql(["P1"]);

            let voices = partsAndMeasures.measures[0].parts["P1"].voices;
            let staves = partsAndMeasures.measures[0].parts["P1"].staves;
            expect(!voices[0]).to.eq(true, "voices are 1-indexed");
            expect(!staves[0]).to.eq(true, "staves are 1-indexed");
            expect(voices.length).to.eq(3);
            expect(staves.length).to.eq(3);
            expect(voices[2].owner).to.eq(2);
            expect(voices[2].divisions).to.eq(8);
            expect(voices[1].divisions).to.eq(8);
            expect(staves[2].divisions).to.eq(8);
            expect(staves[1].divisions).to.eq(8);
            expect(staves[1].length).to.eq(3);
            expect(staves[2].length).to.eq(3);
            _.forEach(staves[1], model => {
                expect(!_.any(staves[2], m2 => model === m2));
            });
            _.forEach(voices[1], model => {
                expect(!_.any(voices[2], m2 => model === m2));
            });
        });
    });
    describe("toScore", function() {
        // todo
    });
});

/*---- samples ----------------------------------------------------------------------------------*/

var helloWorldXML = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.0">
  <movement-title>Song Title</movement-title>
  <identification>
    <creator type="composer">Song Composer</creator>
    <creator type="lyricist">Song Lyricist</creator>
    <creator type="arranger">Song Arranger</creator>
    <rights>Song Copyright</rights>
    <encoding>
      <software>Song Software 1</software>
      <software>Song Software 2</software>
      <encoding-date>2015-03-10</encoding-date>
      <supports attribute="new-page" element="print" type="yes" value="yes"/>
      <supports element="accidental" type="yes"/>
    </encoding>
  </identification>
  <credit page="1">
    <credit-type>title</credit-type>
    <credit-words default-x="597" default-y="1440" font-size="24" justify="center" valign="top">Song Title</credit-words>
  </credit>
  <credit page="1">
    <credit-type>composer</credit-type>
    <credit-words default-x="1124" default-y="1362" font-size="12" justify="right" valign="top">Song Composer</credit-words>
  </credit>
  <credit page="1">
    <credit-type>rights</credit-type>
    <credit-words default-x="597" default-y="70" font-size="10" justify="center" valign="bottom">Song Copyright</credit-words>
  </credit>
  <credit page="1">
    <credit-words default-x="70" default-y="1453" font-size="12" valign="top">Score</credit-words>
  </credit>
  <credit page="2">
    <credit-type>rights</credit-type>
    <credit-words default-x="597" default-y="70" font-size="10" justify="center" valign="bottom">Song Copyright</credit-words>
  </credit>
  <part-list>
    <score-part id="P1">
      <part-name print-object="no">MusicXML Part</part-name>
      <score-instrument id="P1-I1">
        <instrument-name>SmartMusic SoftSynth 1</instrument-name>
      </score-instrument>
      <midi-instrument id="P1-I1">
        <midi-channel>1</midi-channel>
        <midi-bank>15489</midi-bank>
        <midi-program>1</midi-program>
        <volume>80</volume>
        <pan>0</pan>
      </midi-instrument>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1" width="983">
      <print>
        <system-layout>
          <system-margins>
            <left-margin>70</left-margin>
            <right-margin>0</right-margin>
          </system-margins>
          <top-system-distance>211</top-system-distance>
        </system-layout>
        <measure-numbering>system</measure-numbering>
      </print>
      <attributes>
        <divisions>2</divisions>
        <key>
          <fifths>0</fifths>
          <mode>major</mode>
        </key>
        <time>
          <beats>4</beats>
          <beat-type>4</beat-type>
        </time>
        <clef>
          <sign>G</sign>
          <line>2</line>
        </clef>
      </attributes>
      <sound tempo="120"/>
      <note>
        <rest measure="yes"/>
        <duration>8</duration>
        <voice>1</voice>
      </note>
      <barline location="right">
        <bar-style>light-heavy</bar-style>
      </barline>
    </measure>
  </part>
</score-partwise>
`;

var lily43eXML = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 1.0 Partwise//EN"
                                "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise>
  <identification>
    <miscellaneous>
      <miscellaneous-field name="description">A piano staff with dynamics and 
          clef changes, where each element (ffff, wedge and clef changes) 
          applies only to one voice or one staff, respectively.</miscellaneous-field>
    </miscellaneous>
  </identification>
  <part-list>
    <score-part id="P1">
      <part-name>MusicXML Part</part-name>
    </score-part>
  </part-list>
  <!--=========================================================-->
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>8</divisions>
        <key>
          <fifths>0</fifths>
          <mode>major</mode>
        </key>
        <time symbol="common">
          <beats>4</beats>
          <beat-type>4</beat-type>
        </time>
        <staves>2</staves>
        <clef number="1">
          <sign>G</sign>
          <line>2</line>
        </clef>
        <clef number="2">
          <sign>F</sign>
          <line>4</line>
        </clef>
      </attributes>
      <direction placement="below">
        <direction-type>
          <dynamics>
            <ffff/>
          </dynamics>
        </direction-type>
        <staff>1</staff>
      </direction>
      <note>
        <pitch>
          <step>C</step>
          <octave>5</octave>
        </pitch>
        <duration>8</duration>
        <voice>1</voice>
        <type>quarter</type>
        <staff>1</staff>
      </note>
      <note>
        <pitch>
          <step>B</step>
          <octave>4</octave>
        </pitch>
        <duration>8</duration>
        <voice>1</voice>
        <type>quarter</type>
        <staff>1</staff>
      </note>
      <note>
        <pitch>
          <step>A</step>
          <octave>4</octave>
        </pitch>
        <duration>8</duration>
        <voice>1</voice>
        <type>quarter</type>
        <staff>1</staff>
      </note>
      <direction placement="below">
        <direction-type>
          <dynamics>
            <p/>
          </dynamics>
        </direction-type>
        <offset>1</offset>
        <staff>1</staff>
      </direction>
      <note>
        <pitch>
          <step>G</step>
          <octave>4</octave>
        </pitch>
        <duration>8</duration>
        <voice>1</voice>
        <type>quarter</type>
        <staff>1</staff>
      </note>
      <backup>
        <duration>32</duration>
      </backup>
      <direction placement="below">
        <direction-type>
          <wedge spread="0" type="crescendo"/>
        </direction-type>
        <staff>2</staff>
      </direction>
      <note>
        <pitch>
          <step>A</step>
          <octave>2</octave>
        </pitch>
        <duration>8</duration>
        <voice>2</voice>
        <type>quarter</type>
        <staff>2</staff>
      </note>
      <note>
        <pitch>
          <step>B</step>
          <octave>2</octave>
        </pitch>
        <duration>8</duration>
        <voice>2</voice>
        <type>quarter</type>
        <staff>2</staff>
      </note>
      <direction>
        <direction-type>
          <wedge spread="15" type="stop"/>
        </direction-type>
        <staff>2</staff>
      </direction>
      <note>
        <pitch>
          <step>C</step>
          <octave>3</octave>
        </pitch>
        <duration>8</duration>
        <voice>2</voice>
        <type>quarter</type>
        <staff>2</staff>
      </note>
      <note>
        <pitch>
          <step>D</step>
          <octave>3</octave>
        </pitch>
        <duration>8</duration>
        <voice>2</voice>
        <type>quarter</type>
        <staff>2</staff>
      </note>
    </measure>
    <!--=======================================================-->
    <measure number="2">
      <attributes>
        <key>
          <fifths>2</fifths>
          <mode>major</mode>
        </key>
        <clef number="2">
          <sign>G</sign>
          <line>2</line>
        </clef>
      </attributes>
      <note>
        <pitch>
          <step>A</step>
          <octave>4</octave>
        </pitch>
        <duration>8</duration>
        <voice>1</voice>
        <type>quarter</type>
        <staff>1</staff>
      </note>
      <note>
        <pitch>
          <step>B</step>
          <octave>4</octave>
        </pitch>
        <duration>8</duration>
        <voice>1</voice>
        <type>quarter</type>
        <staff>1</staff>
      </note>
      <note>
        <pitch>
          <step>C</step>
          <alter>1</alter>
          <octave>5</octave>
        </pitch>
        <duration>8</duration>
        <voice>1</voice>
        <type>quarter</type>
        <staff>1</staff>
      </note>
      <note>
        <pitch>
          <step>D</step>
          <octave>5</octave>
        </pitch>
        <duration>8</duration>
        <voice>1</voice>
        <type>quarter</type>
        <staff>1</staff>
      </note>
      <backup>
        <duration>32</duration>
      </backup>
      <note>
        <pitch>
          <step>F</step>
          <alter>1</alter>
          <octave>4</octave>
        </pitch>
        <duration>8</duration>
        <voice>2</voice>
        <type>quarter</type>
        <staff>2</staff>
      </note>
      <note>
        <pitch>
          <step>G</step>
          <octave>4</octave>
        </pitch>
        <duration>8</duration>
        <voice>2</voice>
        <type>quarter</type>
        <staff>2</staff>
      </note>
      <note>
        <pitch>
          <step>A</step>
          <octave>4</octave>
        </pitch>
        <duration>8</duration>
        <voice>2</voice>
        <type>quarter</type>
        <staff>2</staff>
      </note>
      <note>
        <pitch>
          <step>B</step>
          <octave>4</octave>
        </pitch>
        <duration>8</duration>
        <voice>2</voice>
        <type>quarter</type>
        <staff>2</staff>
      </note>
    </measure>
    <!--=======================================================-->
    <measure number="3">
      <attributes>
        <clef number="1">
          <sign>C</sign>
          <line>2</line>
        </clef>
      </attributes>
      <note>
        <pitch>
          <step>D</step>
          <octave>5</octave>
        </pitch>
        <duration>8</duration>
        <voice>1</voice>
        <type>quarter</type>
        <staff>1</staff>
      </note>
      <note>
        <pitch>
          <step>C</step>
          <alter>1</alter>
          <octave>5</octave>
        </pitch>
        <duration>8</duration>
        <voice>1</voice>
        <type>quarter</type>
        <staff>1</staff>
      </note>
      <note>
        <pitch>
          <step>B</step>
          <octave>4</octave>
        </pitch>
        <duration>8</duration>
        <voice>1</voice>
        <type>quarter</type>
        <staff>1</staff>
      </note>
      <note>
        <pitch>
          <step>A</step>
          <octave>4</octave>
        </pitch>
        <duration>8</duration>
        <voice>1</voice>
        <type>quarter</type>
        <staff>1</staff>
      </note>
      <backup>
        <duration>32</duration>
      </backup>
      <note>
        <pitch>
          <step>A</step>
          <octave>4</octave>
        </pitch>
        <duration>8</duration>
        <voice>2</voice>
        <type>quarter</type>
        <staff>2</staff>
      </note>
      <note>
        <pitch>
          <step>B</step>
          <octave>4</octave>
        </pitch>
        <duration>8</duration>
        <voice>2</voice>
        <type>quarter</type>
        <staff>2</staff>
      </note>
      <note>
        <pitch>
          <step>C</step>
          <alter>1</alter>
          <octave>5</octave>
        </pitch>
        <duration>8</duration>
        <voice>2</voice>
        <type>quarter</type>
        <staff>2</staff>
      </note>
      <note>
        <pitch>
          <step>D</step>
          <octave>5</octave>
        </pitch>
        <duration>8</duration>
        <voice>2</voice>
        <type>quarter</type>
        <staff>2</staff>
      </note>
    </measure>
    <!--=======================================================-->
    <measure number="4">
      <note>
        <rest/>
        <duration>32</duration>
        <voice>1</voice>
        <staff>1</staff>
      </note>
      <backup>
        <duration>32</duration>
      </backup>
      <note>
        <rest/>
        <duration>32</duration>
        <voice>2</voice>
        <staff>2</staff>
      </note>
      <barline location="right">
        <bar-style>light-heavy</bar-style>
      </barline>
    </measure>
  </part>
  <!--=========================================================-->
</score-partwise>`;
