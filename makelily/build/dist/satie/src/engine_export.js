/**
 * This file is part of Satie music engraver <https://github.com/emilyskidsister/satie>.
 * Copyright (C) Jocelyn Stericker <jocelyn@nettek.ca> 2015 - present.
 *
 * Satie is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * Satie is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Satie.  If not, see <http://www.gnu.org/licenses/>.
 */
import { serializeScoreHeader } from "musicxml-interfaces";
import { forEach, map } from "lodash";
export function exportXML(score) {
    var out = "";
    out += serializeScoreHeader(score.header) + "\n";
    var recordedSongMeta = false;
    forEach(score.measures, function (measure) {
        // TODO: dehack
        out += "<measure number=\"" + measure.number + "\">\n";
        forEach(measure.parts, function (part, id) {
            out += "  <part id=\"" + id + "\">\n";
            out += "    <!-- measure metadata (Satie) -->\n";
            if (!recordedSongMeta) {
                out +=
                    "    <direction placement=\"below\"><direction-type><words default-y=\"-70\" relative-x=\"-5000\">" +
                        ("SATIE_SONG_META = " + JSON.stringify({}) + ";") +
                        "</words></direction-type></direction>\n";
                recordedSongMeta = true;
            }
            out +=
                "    <direction placement=\"below\"><direction-type><words default-y=\"-70\" relative-x=\"-5000\">" +
                    ("SATIE_MEASURE_META = " + JSON.stringify({ uuid: measure.uuid }) + ";") +
                    "</words></direction-type></direction>\n";
            out += "    <!-- end of measure metadata (Satie) -->\n";
            forEach(part.staves, function (staff, staffIdx) {
                if (staff) {
                    out += "    <!-- staff " + staffIdx + " -->\n";
                    out +=
                        map(staff, function (model) { return model.toXML(); })
                            .join("\n")
                            .split("\n")
                            .map(function (t) { return "    " + t; })
                            .join("\n") + "\n";
                    var divCount = staff.reduce(function (sum, item) { return sum + item.divCount; }, 0);
                    out += "    <backup><duration>" + divCount + "</duration></backup>\n";
                    out += "    <!-- end of staff " + staffIdx + " -->\n";
                }
            });
            forEach(part.voices, function (voice, voiceIdx) {
                if (voice) {
                    out += "    <!-- voice " + voiceIdx + " -->\n";
                    out +=
                        map(voice, function (model) { return model.toXML(); })
                            .join("\n")
                            .split("\n")
                            .map(function (t) { return "    " + t; })
                            .join("\n") + "\n";
                    var divCount = voice.reduce(function (sum, item) { return sum + item.divCount; }, 0);
                    out += "    <backup><duration>" + divCount + "</duration></backup>\n";
                    out += "    <!-- end of voice " + voiceIdx + " -->\n";
                }
            });
            out += "  </part>\n";
        });
        out += "</measure>\n";
    });
    return ('<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<!DOCTYPE score-timewise PUBLIC "-//Recordare//DTD MusicXML 3.0 Timewise//EN"\n' +
        '                                "http://www.musicxml.org/dtds/timewise.dtd">\n' +
        "<score-timewise>\n" +
        out
            .split("\n")
            .map(function (t) { return "  " + t; })
            .join("\n") +
        "</score-timewise>");
}
//# sourceMappingURL=engine_export.js.map