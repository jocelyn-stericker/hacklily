/**
 * @source: https://github.com/jnetterf/satie/
 *
 * @license
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

import {serializeScoreHeader} from "musicxml-interfaces";
import {forEach, map} from "lodash";

import IDocument from "../document/document";

export function exportXML(score: IDocument, cb: (error: Error, xml: string) => void) {
    let out = "";
    out += serializeScoreHeader(score.header) + "\n";
    let recordedSongMeta = false;
    forEach(score.measures, measure => {
        // TODO: dehack
        out += `<measure number="${measure.number}">\n`;
        forEach(measure.parts, (part, id) => {
            out += `  <part id="${id}">\n`;
            out += `    <!-- measure metadata (Satie) -->\n`;
            if (!recordedSongMeta) {
                out += `    <direction placement="below"><direction-type><words default-y="-70" relative-x="-5000">` +
                    `SATIE_SONG_META = ${JSON.stringify({})};` +
                    `</words></direction-type></direction>\n`;
                recordedSongMeta = true;
            }
            out += `    <direction placement="below"><direction-type><words default-y="-70" relative-x="-5000">` +
                `SATIE_MEASURE_META = ${JSON.stringify({uuid: measure.uuid})};` +
                `</words></direction-type></direction>\n`;
            out += `    <!-- end of measure metadata (Satie) -->\n`;
            forEach(part.staves, (staff, staffIdx) => {
                if (staff) {
                    out += `    <!-- staff ${staffIdx} -->\n`;
                    out += (map(staff, model =>
                                (<any>model).toXML())
                                    .join("\n")
                                    .split("\n")
                                    .map(t => "    " + t)
                                    .join("\n")) + "\n";
                    let divCount = staff.reduce((sum, item) => sum + item.divCount, 0);
                    out += `    <backup><duration>${divCount}</duration></backup>\n`;
                    out += `    <!-- end of staff ${staffIdx} -->\n`;
                }
            });
            forEach(part.voices, (voice, voiceIdx) => {
                if (voice) {
                    out += `    <!-- voice ${voiceIdx} -->\n`;
                    out += (map(voice, model =>
                            (<any>model).toXML())
                                .join("\n")
                                .split("\n")
                                .map(t => "    " + t)
                                .join("\n")) + "\n";
                    let divCount = voice.reduce((sum, item) => sum + item.divCount, 0);
                    out += `    <backup><duration>${divCount}</duration></backup>\n`;
                    out += `    <!-- end of voice ${voiceIdx} -->\n`;
                }
            });
            out += `  </part>\n`;
        });
        out += `</measure>\n`;
    });

    cb(null,
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
        "<!DOCTYPE score-timewise PUBLIC \"-//Recordare//DTD MusicXML 3.0 Timewise//EN\"\n" +
        "                                \"http://www.musicxml.org/dtds/timewise.dtd\">\n" +
        "<score-timewise>\n" +
        out.split("\n").map(t => "  " + t).join("\n") +
        "</score-timewise>"
    );
}

