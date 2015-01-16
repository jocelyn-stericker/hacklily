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

import MusicXML         = require("musicxml-interfaces");
import _                = require("lodash");

import Attributes       = require("./attributes");
import Barline          = require("./barline");
import BeamGroup        = require("./beamGroup");
import Chord            = require("./chord");
import Direction        = require("./direction");
import Engine           = require("./engine");
import Factory          = require("./factory");
import FiguredBass      = require("./figuredBass");
import Grouping         = require("./grouping");
import Harmony          = require("./harmony");
import MXMLImport       = require("./mxml/import");
import Print            = require("./print");
import Proxy            = require("./proxy");
import Sound            = require("./sound");

export function makeFactory() {
    return new Factory([
            Attributes,
            Barline,
            BeamGroup,
            Chord,
            Direction,
            FiguredBass,
            Grouping,
            Harmony,
            Print,
            Proxy,
            Sound
    ]);
}

export function importXML(src: string): Engine.IDocument {
    let mxmljson    = MusicXML.parse(src);
    if ((<any>mxmljson).error) {
        throw (<any>mxmljson).error;
    }
    let factory = makeFactory();
    let score = MXMLImport.toScore(mxmljson, factory);
    if (score.error) {
        throw score.error;
    }

    let memo$ = Engine.Options.ILinesLayoutMemo.create();
    let contextOptions: Engine.Options.ILayoutOptions = {
        measures: score.measures,
        pageLayout: score.header.defaults.pageLayout,
        page$: 0,
        modelFactory: factory
    }
    Engine.validate$(contextOptions, memo$);
    
    return score;
}

export function exportXML(score: Engine.IDocument): string {
    let out = "";
    out += score.header.toXML() + "\n";
    _.forEach(score.measures, measure => {
        // TODO: dehack
        out += `<measure number="${measure.number}">\n`;
        _.forEach(measure.parts, (part, id) => {
            out += `  <part id="${id}">\n`;
            // TODO: merge
            _.forEach(part.voices, voice => {
                if (voice && voice.voiceSegment) {
                    out += (_.map(voice.voiceSegment.models, model =>
                            (<any>model).toXML())
                                .join("\n")
                                .split("\n")
                                .map(t => "    " + t)
                                .join("\n")) + "\n";
                }
            });
            _.forEach(part.staves, staff => {
                if (staff && staff.staffSegment) {
                    out += (_.map(staff.staffSegment.models, model =>
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

    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-timewise PUBLIC "-//Recordare//DTD MusicXML 1.0 Timewise//EN"
                                "http://www.musicxml.org/dtds/timewise.dtd">
<score-timewise>
${out.split("\n").map(t => "  " + t).join("\n")}
</score-timewise>`;
}
