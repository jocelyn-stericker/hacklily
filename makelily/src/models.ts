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

import MusicXML                 = require("musicxml-interfaces");
import _                        = require("lodash");

import Attributes               = require("./models/attributes");
import Barline                  = require("./models/barline");
import Chord                    = require("./models/chord");
import Direction                = require("./models/direction");
import Engine                   = require("./models/engine");
import FontManager              = require("./models/fontManager");
import Factory                  = require("./models/factory");
import FiguredBass              = require("./models/figuredBass");
import Grouping                 = require("./models/grouping");
import Harmony                  = require("./models/harmony");
import MXMLImport               = require("./models/mxml/import");
import Print                    = require("./models/print");
import Proxy                    = require("./models/proxy");
import Sound                    = require("./models/sound");
import Spacer                   = require("./models/spacer");

import VoiceStaffStemDirection  = require("./models/preprocessors/voiceStaffStemDirection");

export function makeFactory() {
    return new Factory([
            Attributes,
            Barline,
            Chord,
            Direction,
            FiguredBass,
            Grouping,
            Harmony,
            Print,
            Proxy,
            Sound,
            Spacer
    ]);
}

function _importXML(src: string) {
    let mxmljson    = MusicXML.parse(src);
    if ((<any>mxmljson).error) {
        throw (<any>mxmljson).error;
    }
    let factory = makeFactory();
    let score = MXMLImport.toScore(mxmljson, factory);
    if (score.error) {
        throw score.error;
    }

    let memo$ = Engine.Options.ILinesLayoutMemo.create(NaN);
    let contextOptions: Engine.Options.ILayoutOptions = {
        attributes:     null,
        measures:       score.measures,
        header:         score.header,
        print$:         null,
        page$:          0,
        modelFactory:   factory,
        preProcessors:  [VoiceStaffStemDirection],
        postProcessors: []
    };
    Engine.validate$(contextOptions, memo$);
    score.header.overwriteEncoding();

    return score;
}

export function importXML(src: string, cb: (error: Error, document?: Engine.IDocument) => void) {
    FontManager.requireFont("Bravura", "root://bravura/otf/Bravura.otf");
    FontManager.requireFont("Alegreya", "root://alegreya/Alegreya-Regular.ttf");
    FontManager.requireFont("Alegreya", "root://alegreya/Alegreya-Bold.ttf", "bold");
    FontManager.whenReady((err) => {
        if (err) {
            cb(err);
        } else {
            try {
                cb(null, _importXML(src));
            } catch(err) {
                cb(err);
            }
        }
    });
}

export function exportXML(score: Engine.IDocument, cb: (error: Error, xml: string) => void) {
    let out = "";
    out += score.header.toXML() + "\n";
    _.forEach(score.measures, measure => {
        // TODO: dehack
        out += `<measure number="${measure.number}">\n`;
        _.forEach(measure.parts, (part, id) => {
            out += `  <part id="${id}">\n`;
            // TODO: merge
            _.forEach(part.voices, voice => {
                if (voice) {
                    out += (_.map(voice, model =>
                            (<any>model).toXML())
                                .join("\n")
                                .split("\n")
                                .map(t => "    " + t)
                                .join("\n")) + "\n";
                }
            });
            _.forEach(part.staves, staff => {
                if (staff) {
                    out += (_.map(staff, model =>
                                (<any>model).toXML())
                                    .join("\n")
                                    .split("\n")
                                    .map(t => "    " + t)
                                    .join("\n")) + "\n";
                }
            });
            out += `  </part>\n`;
        });
        out += `</measure>\n`;
    });

    cb(null, `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-timewise PUBLIC "-//Recordare//DTD MusicXML 1.0 Timewise//EN"
                                "http://www.musicxml.org/dtds/timewise.dtd">
<score-timewise>
${out.split("\n").map(t => "  " + t).join("\n")}
</score-timewise>`);
}
