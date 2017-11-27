"use strict";
/**
 * This file is part of Satie music engraver <https://github.com/jnetterf/satie>.
 * Copyright (C) Joshua Netterfield <joshua.ca> 2015 - present.
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
Object.defineProperty(exports, "__esModule", { value: true });
var musicxml_interfaces_1 = require("musicxml-interfaces");
var lodash_1 = require("lodash");
function exportXML(score) {
    var out = "";
    out += musicxml_interfaces_1.serializeScoreHeader(score.header) + "\n";
    var recordedSongMeta = false;
    lodash_1.forEach(score.measures, function (measure) {
        // TODO: dehack
        out += "<measure number=\"" + measure.number + "\">\n";
        lodash_1.forEach(measure.parts, function (part, id) {
            out += "  <part id=\"" + id + "\">\n";
            out += "    <!-- measure metadata (Satie) -->\n";
            if (!recordedSongMeta) {
                out += "    <direction placement=\"below\"><direction-type><words default-y=\"-70\" relative-x=\"-5000\">" +
                    ("SATIE_SONG_META = " + JSON.stringify({}) + ";") +
                    "</words></direction-type></direction>\n";
                recordedSongMeta = true;
            }
            out += "    <direction placement=\"below\"><direction-type><words default-y=\"-70\" relative-x=\"-5000\">" +
                ("SATIE_MEASURE_META = " + JSON.stringify({ uuid: measure.uuid }) + ";") +
                "</words></direction-type></direction>\n";
            out += "    <!-- end of measure metadata (Satie) -->\n";
            lodash_1.forEach(part.staves, function (staff, staffIdx) {
                if (staff) {
                    out += "    <!-- staff " + staffIdx + " -->\n";
                    out += (lodash_1.map(staff, function (model) {
                        return model.toXML();
                    })
                        .join("\n")
                        .split("\n")
                        .map(function (t) { return "    " + t; })
                        .join("\n")) + "\n";
                    var divCount = staff.reduce(function (sum, item) { return sum + item.divCount; }, 0);
                    out += "    <backup><duration>" + divCount + "</duration></backup>\n";
                    out += "    <!-- end of staff " + staffIdx + " -->\n";
                }
            });
            lodash_1.forEach(part.voices, function (voice, voiceIdx) {
                if (voice) {
                    out += "    <!-- voice " + voiceIdx + " -->\n";
                    out += (lodash_1.map(voice, function (model) {
                        return model.toXML();
                    })
                        .join("\n")
                        .split("\n")
                        .map(function (t) { return "    " + t; })
                        .join("\n")) + "\n";
                    var divCount = voice.reduce(function (sum, item) { return sum + item.divCount; }, 0);
                    out += "    <backup><duration>" + divCount + "</duration></backup>\n";
                    out += "    <!-- end of voice " + voiceIdx + " -->\n";
                }
            });
            out += "  </part>\n";
        });
        out += "</measure>\n";
    });
    return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
        "<!DOCTYPE score-timewise PUBLIC \"-//Recordare//DTD MusicXML 3.0 Timewise//EN\"\n" +
        "                                \"http://www.musicxml.org/dtds/timewise.dtd\">\n" +
        "<score-timewise>\n" +
        out.split("\n").map(function (t) { return "  " + t; }).join("\n") +
        "</score-timewise>";
}
exports.exportXML = exportXML;
//# sourceMappingURL=engine_export.js.map