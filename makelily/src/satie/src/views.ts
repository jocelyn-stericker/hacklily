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

import {Print} from "musicxml-interfaces";
import {createFactory as $, ReactElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {find} from "lodash";

import Page from "./views/page";
import {layout, ILinesLayoutState, ILinesLayoutMemo, IModel, IDocument, IPrint,
    RenderTarget} from "./engine";

import {inject as injectSVG} from "./views/svgext_injection";

injectSVG();

export function getPrint(doc: IDocument, startMeasure: number): Print {
    let factory = doc.factory;
    if (!factory) {
        throw new Error("Document has no factory");
    }
    let firstMeasure = doc.measures[startMeasure];
    if (!firstMeasure) {
        throw new Error("No such measure " + startMeasure);
    }
    let partWithPrint = find(firstMeasure.parts, part => !!part.staves[1] &&
            factory.search(part.staves[1], 0, IModel.Type.Print).length);

    if (partWithPrint) {
        return <any> factory.search(partWithPrint.staves[1], 0, IModel.Type.Print)[0];
    }
    
    throw new Error("Part does not contain a Print element at division 0. Is it validated?");
}

export function getTop(print: Print, pageNum: number) {
    const pageMarginsAll = print.pageLayout.pageMargins;
    const pageMargins = IPrint.getPageMargins(pageMarginsAll, pageNum);

    return print.pageLayout.pageHeight -
        (print.systemLayout.topSystemDistance +
            pageMargins.topMargin);
}

/**
 * @param doc a validated snapshot
 * @param memo$ created from ILinesLayoutMemo.create(). You can pass memo$ back
 *  after a change for incremental updates.
 */
export function getPage(doc: IDocument, startMeasure: number,
        memo$: ILinesLayoutState, renderTarget = RenderTarget.SvgExport,
        pageClassName = ""): ReactElement<Page.IProps> {
    let print = getPrint(doc, startMeasure);

    const pageNum = 1; // FIXME

    const lineLayouts = layout({
        attributes: {},
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
    let print = getPrint(doc, startMeasure);
    let top = getTop(print, 0);
    let memo$ = ILinesLayoutMemo.create(top);
    const core = renderToStaticMarkup(getPage(doc, startMeasure, memo$));

     return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>${
         core.replace("<svg", "<svg xmlns=\"http://www.w3.org/2000/svg\"")
             .replace(/class="tn_"/g, "font-family='Alegreya'")
             .replace(/class="mmn_"/g, "font-family='Alegreya' " +
                         "font-style='italic' stroke='#7a7a7a'")
             .replace(/class="bn_"/g, "font-family='Alegreya' " +
                     "font-style='italic' text-anchor='end' stroke='#7a7a7a'")
             .replace(/<noscript><\/noscript>/g, "")}`;
}
