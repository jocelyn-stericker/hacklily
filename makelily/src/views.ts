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

import MusicXML             = require("musicxml-interfaces");
import React                = require("react");
import _                    = require("lodash");
import invariant            = require("react/lib/invariant");
var $                       = React.createFactory;

import Engine               = require("./models/engine");
import Page                 = require("./views/page");
import SvgExt               = require("./views/svgext_injection");

import Beam                 = require("./models/postprocessors/beam");
import Center               = require("./models/postprocessors/center");
import Justify              = require("./models/postprocessors/justify");
import RemoveOverlaps       = require("./models/postprocessors/removeOverlaps");
import Tieds                = require("./models/postprocessors/tieds");

SvgExt.inject();

export function getPage(doc: Engine.IDocument, startMeasure: number,
        renderTarget = Page.RenderTarget.SvgExport, pageClassName = ""): React.ReactElement<Page.IProps> {
    let factory = doc.factory;
    const pageNum = 1; // FIXME
    if (!factory) {
        throw new Error("Document has no factory");
    }
    let firstMeasure = doc.measures[startMeasure];
    if (!firstMeasure) {
        throw new Error("No such measure " + startMeasure);
    }
    let partWithPrint = _.find(firstMeasure.parts, part => !!part.staves[1] &&
            factory.searchHere(part.staves[1], 0, Engine.IModel.Type.Print).length);
    let print: MusicXML.Print;

    if (partWithPrint) {
        print = <any> factory.searchHere(partWithPrint.staves[1], 0, Engine.IModel.Type.Print)[0];
        invariant(!!print, "Wait what?");
    } else {
        throw new Error("Part does not contain a Print element at division 0. Is it validated?");
    }

    const pageMarginsAll    = print.pageLayout.pageMargins;
    const pageMargins       = Engine.IPrint.getPageMargins(pageMarginsAll, pageNum);
    const top               = print.pageLayout.pageHeight -
                                (print.systemLayout.topSystemDistance +
                                 pageMargins.topMargin);

    let memo$ = Engine.Options.ILinesLayoutMemo.create(top);
    const lineLayouts = Engine.layout$({
        attributes:     null,
        measures:       doc.measures,
        header:         doc.header,
        print$:         print,
        page$:          pageNum,
        modelFactory:   doc.factory,
        debug:          true,
        preProcessors:  [],
        postProcessors: [Justify, Beam, Center, Tieds, RemoveOverlaps]
    }, memo$);

    return $(Page)({
        scoreHeader:    doc.header,
        lineLayouts:    lineLayouts,
        "print":        print,
        renderTarget:   renderTarget,
        className:      pageClassName
    });
}

/**
 * Renders a single page starting at `startMeasure`.
 * 
 * @param doc Validated document
 * 
 * @param startMeasure the index from 0 (not to be confused with the
 *        measure number string) of the first measure.
 */
export function renderDocument(doc: Engine.IDocument, startMeasure: number): string {
    const core = React.renderToStaticMarkup(getPage(doc, startMeasure));

    return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>${
        core.replace("<svg", "<svg xmlns=\"http://www.w3.org/2000/svg\"")
            .replace(/class="mn_"/g, "font-family='bravura'")
            .replace(/class="tn_"/g, "font-family='Alegreya'")
            .replace(/class="mmn_"/g, "font-family='Alegreya' " +
                        "font-style='italic' stroke='#7a7a7a'")
            .replace(/class="bn_"/g, "font-family='Alegreya' " +
                    "font-style='italic' text-anchor='end' stroke='#7a7a7a'")
            .replace(/<noscript><\/noscript>/g, "")}`;
}
