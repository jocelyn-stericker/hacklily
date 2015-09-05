/**
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

"use strict";

import ScoreHeader from "../scoreHeader";

import {expect} from "chai";

import {parse as parseFromXML, LeftCenterRight} from "musicxml-interfaces";

let headerTest = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.0 Partwise//EN"
    "http://www.musicxml.org/dtds/partwise.dtd">
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
    <credit-words default-x="597" default-y="1440" font-size="24" justify="center" valign="top">
        Song Title
    </credit-words>
  </credit>
  <credit page="1">
    <credit-type>composer</credit-type>
    <credit-words default-x="1124" default-y="1362" font-size="12" justify="right" valign="top">
        Song Composer
    </credit-words>
  </credit>
  <credit page="1">
    <credit-type>rights</credit-type>
    <credit-words default-x="597" default-y="70" font-size="10" justify="center" valign="bottom">
        Song Copyright
    </credit-words>
  </credit>
  <credit page="1">
    <credit-words default-x="70" default-y="1453" font-size="12" valign="top">Score</credit-words>
  </credit>
  <credit page="2">
    <credit-type>rights</credit-type>
    <credit-words default-x="597" default-y="70" font-size="10" justify="center" valign="bottom">
        Song Copyright
    </credit-words>
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

let minimalTest = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.0 Partwise//EN"
    "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="3.0">
  <part-list>
    <score-part id="P1">
      <part-name print-object="no">MusicXML Part</part-name>
    </score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
    </measure>
  </part>
</score-partwise>
`;

describe("[engine/scoreHeader.ts]", function() {
    // NOTE: Some of the tests in mxmljson_test indirectly test ScoreHeader!
    it("can correctly modify metadata", function() {
        let mxmljson = parseFromXML(headerTest);
        let scoreHeader = new ScoreHeader(mxmljson);
        expect(scoreHeader.credits.length).eq(5);
        expect(scoreHeader.identification.creators.length).eq(3);

        // Changing the composer should change the credit words and identification
        scoreHeader.composer = "New Composer";
        expect(scoreHeader.credits.length).eq(5);
        expect(scoreHeader.identification.creators.length).eq(3);
        expect(scoreHeader.composer).to.eq("New Composer"); // Since get is not directly tied to set
        expect(scoreHeader.identification.creators[0].creator).to.eq("New Composer");
        expect(scoreHeader.identification.creators[1].creator).to.not.eq("New Composer");
        expect(scoreHeader.identification.creators[2].creator).to.not.eq("New Composer");
        expect(scoreHeader.credits[1].creditWords[0].words).to.eq("New Composer");

        // Changing the title should change credit words and movementTitle
        scoreHeader.title = "New Title";
        expect(scoreHeader.credits.length).eq(5);
        expect(scoreHeader.identification.creators.length).eq(3);
        expect(scoreHeader.title).to.eq("New Title"); // Since get is not directly tied to set
        expect(scoreHeader.movementTitle).to.eq("New Title");
        expect(scoreHeader.credits[0].creditWords[0].words).to.eq("New Title");
    });
    it("can correctly add metadata", function() {
        let mxmljson = parseFromXML(minimalTest);
        let scoreHeader = new ScoreHeader(mxmljson);
        expect(scoreHeader.credits.length).eq(0);
        expect(scoreHeader.identification.creators.length).eq(0);

        scoreHeader.title = "Orig Title";
        scoreHeader.composer = "Orig Composer";
        scoreHeader.arranger = "Orig Arranger";
        scoreHeader.lyricist = "Orig Lyricist";

        expect(scoreHeader.credits).to.deep.equal([
            {
                creditImage: null,
                creditTypes: ["title"],
                creditWords: [{
                    words: "Orig Title",

                    defaultX: 664.3076923076923,
                    defaultY: 1657.8461538461538,
                    fontSize: "18px",
                    justify: LeftCenterRight.Center
                }],
                page: 1
            },
            {
                creditImage: null,
                creditTypes: ["composer"],
                creditWords: [{
                    words: "Orig Composer",

                    defaultX: 1234.7692307692307,
                    defaultY: 1596.3076923076922,
                    fontSize: "12px",
                    justify: LeftCenterRight.Right
                }],
                page: 1
            },
            {
                creditImage: null,
                creditTypes: ["arranger"],
                creditWords: [{
                    words: "Orig Arranger",

                    defaultX: 1234.7692307692307,
                    defaultY: 1503.9999999999998,
                    fontSize: "12px",
                    justify: LeftCenterRight.Right
                }],
                page: 1
            },
            {
                creditImage: null,
                creditTypes: ["lyricist"],
                creditWords: [{
                    words: "Orig Lyricist",

                    defaultX: 1234.7692307692307,
                    defaultY: 1411.6923076923076,
                    fontSize: "12px",
                    justify: LeftCenterRight.Right
                }],
                page: 1
            }
        ]);
    });
});
