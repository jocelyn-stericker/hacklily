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
import React            = require("react");
import _                = require("lodash");

import Engine           = require("./models/engine");
import Page             = require("./views/page");
var $                   = React.createFactory;

export function render(doc: Engine.IDocument, startMeasure: number): string {
    let factory = doc.factory;
    if (!factory) {
        throw new Error("Document has no factory");
    }
    let firstMeasure = doc.measures[startMeasure];
    if (!firstMeasure) {
        throw new Error("No such measure " + startMeasure);
    }
    let partWithPrint = _.find(firstMeasure.parts, part =>
            factory.modelHasType(part.staves[1][0], Engine.IModel.Type.Print));
    let print: MusicXML.Print;
    if (partWithPrint) {
        print = <any> partWithPrint.staves[1][0];
    } else {
        throw new Error("Part does not start with a Print element");
    }

    return React.renderToString($(Page)({
        scoreHeader:    doc.header,
        print:          print,
        renderTarget:   Page.RenderTarget.SvgExport
    }));
}

