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

import MusicXML = require("musicxml-interfaces");
import {createFactory as $, renderToStaticMarkup, ReactElement} from "react";
import _ = require("lodash");
import invariant = require("react/lib/invariant");

import Page from "./views/page";
import {layout, ILinesLayoutMemo, IModel, IDocument, IPrint, RenderTarget} from "./engine";

import {inject as injectSVG} from "./views/svgext_injection";

injectSVG();

export function getPage(doc: IDocument, startMeasure: number,
        renderTarget = RenderTarget.SvgExport, pageClassName = ""):
            ReactElement<Page.IProps> {
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
            factory.search(part.staves[1], 0, IModel.Type.Print).length);
    let print: MusicXML.Print;

    if (partWithPrint) {
        print = <any> factory.search(partWithPrint.staves[1], 0, IModel.Type.Print)[0];
        invariant(!!print, "Wait what?");
    } else {
        throw new Error("Part does not contain a Print element at division 0. Is it validated?");
    }

    const pageMarginsAll = print.pageLayout.pageMargins;
    const pageMargins = IPrint.getPageMargins(pageMarginsAll, pageNum);
    const top = print.pageLayout.pageHeight -
                                (print.systemLayout.topSystemDistance +
                                 pageMargins.topMargin);

    let memo$ = ILinesLayoutMemo.create(top);
    const lineLayouts = layout({
        attributes: null,
        debug: true,
        header: doc.header,
        measures: doc.measures,
        modelFactory: doc.factory,
        page$: pageNum,
        postprocessors: doc.factory.postprocessors,
        preprocessors: [],
        print$: print
    }, memo$);

    return $(Page)({
        className: pageClassName,
        lineLayouts: lineLayouts,
        print: print,
        renderTarget: renderTarget,
        scoreHeader: doc.header
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
export function renderDocument(doc: IDocument, startMeasure: number): string {
    const core = renderToStaticMarkup(getPage(doc, startMeasure));

     return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>${
         core.replace("<svg", "<svg xmlns=\"http://www.w3.org/2000/svg\"")
             .replace(/class="tn_"/g, "font-family='Alegreya'")
             .replace(/class="mmn_"/g, "font-family='Alegreya' " +
                         "font-style='italic' stroke='#7a7a7a'")
             .replace(/class="bn_"/g, "font-family='Alegreya' " +
                     "font-style='italic' text-anchor='end' stroke='#7a7a7a'")
             .replace(/<noscript><\/noscript>/g, "")}`;
}
