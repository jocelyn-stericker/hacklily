// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

import { forEach, map } from "lodash";

import { serializeScoreHeader } from "#/musicxml-interfaces";

import type { Document } from "./document";

export function exportXML(score: Document): string {
  let out = "";
  out += serializeScoreHeader(score.header) + "\n";
  let recordedSongMeta = false;
  forEach(score.measures, (measure) => {
    // TODO: dehack
    out += `<measure number="${measure.number}">\n`;
    forEach(measure.parts, (part, id) => {
      out += `  <part id="${id}">\n`;
      out += `    <!-- measure metadata (Satie) -->\n`;
      if (!recordedSongMeta) {
        out +=
          `    <direction placement="below"><direction-type><words default-y="-70" relative-x="-5000">` +
          `SATIE_SONG_META = ${JSON.stringify({})};` +
          `</words></direction-type></direction>\n`;
        recordedSongMeta = true;
      }
      out +=
        `    <direction placement="below"><direction-type><words default-y="-70" relative-x="-5000">` +
        `SATIE_MEASURE_META = ${JSON.stringify({ uuid: measure.uuid })};` +
        `</words></direction-type></direction>\n`;
      out += `    <!-- end of measure metadata (Satie) -->\n`;
      forEach(part.staves, (staff, staffIdx) => {
        if (staff) {
          out += `    <!-- staff ${staffIdx} -->\n`;
          out +=
            map(staff, (model) => (<any>model).toXML())
              .join("\n")
              .split("\n")
              .map((t) => "    " + t)
              .join("\n") + "\n";
          const divCount = staff.reduce((sum, item) => sum + item.divCount, 0);
          out += `    <backup><duration>${divCount}</duration></backup>\n`;
          out += `    <!-- end of staff ${staffIdx} -->\n`;
        }
      });
      forEach(part.voices, (voice, voiceIdx) => {
        if (voice) {
          out += `    <!-- voice ${voiceIdx} -->\n`;
          out +=
            map(voice, (model) => (<any>model).toXML())
              .join("\n")
              .split("\n")
              .map((t) => "    " + t)
              .join("\n") + "\n";
          const divCount = voice.reduce((sum, item) => sum + item.divCount, 0);
          out += `    <backup><duration>${divCount}</duration></backup>\n`;
          out += `    <!-- end of voice ${voiceIdx} -->\n`;
        }
      });
      out += `  </part>\n`;
    });
    out += `</measure>\n`;
  });

  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<!DOCTYPE score-timewise PUBLIC "-//Recordare//DTD MusicXML 3.0 Timewise//EN"\n' +
    '                                "http://www.musicxml.org/dtds/timewise.dtd">\n' +
    "<score-timewise>\n" +
    out
      .split("\n")
      .map((t) => "  " + t)
      .join("\n") +
    "</score-timewise>"
  );
}
