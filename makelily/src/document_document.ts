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

import {createFactory, ReactElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";

import {ScoreHeader, Print, Grouping, FiguredBass, Attributes, Sound, Direction,
        Harmony, Barline} from "musicxml-interfaces";
import {IAny} from "musicxml-interfaces/operations";
import {find} from "lodash";

import ProxyExports from "./implProxy_proxyModel";
import SpacerExports from "./implSpacer_spacerModel";
import VisualCursorExports from "./implVisualCursor_visualCursorModel";

import {IFactory} from "./private_factory";

import {ILayoutOptions} from "./private_layoutOptions";
import {ILinesLayoutState, newLayoutState} from "./private_linesLayoutState";
import {getPageMargins} from "./private_print";
import {IChord} from "./private_chordUtil";

import validate from "./engine_processors_validate";
import layoutSong from "./engine_processors_layout";

import PageView from "./implPage_pageView";

import {IMeasure} from "./document_measure";
import {IModel} from "./document_model";
import Type from "./document_types";

const $PageView = createFactory(PageView);

export interface IDocument {
    /**
     * If the document is in the error state, the error will be set, and no other
     * parameters will be set. 
     *
     * If the document is not in the error state, the error will be null.
     */
    error: Error;

    /**
     * The MusicXML header. This holds data not attached to a measure or part.
     */
    header: ScoreHeader;

    /**
     * The main body of the song.
     */
    measures: IMeasure[];

    /**
     * The part slugs (e.g., P0, P1, ...), ordered by numerical part ID.
     */
    parts: string[];

    _visualCursor: any;

    /**
     * Returns true if the model is any of the types provided. If so, it can be casted to the
     * equivilent MusicXML interface.
     *
     * e.g., if (doc.modelHasType(model, Type.Chord)) { (model as MusicXML.Note[])... }
     */
    modelHasType(model: IModel, modelType: Type.Chord): model is (IChord & IModel);
    modelHasType(model: IModel, modelType: Type.Print): model is (Print & IModel);
    modelHasType(model: IModel, modelType: Type.Grouping): model is (Grouping & IModel);
    modelHasType(model: IModel, modelType: Type.FiguredBass): model is (FiguredBass & IModel);
    modelHasType(model: IModel, modelType: Type.Attributes): model is (Attributes & IModel);
    modelHasType(model: IModel, modelType: Type.Sound): model is (Sound & IModel);
    modelHasType(model: IModel, modelType: Type.Direction): model is (Direction & IModel);
    modelHasType(model: IModel, modelType: Type.Harmony): model is (Harmony & IModel);
    modelHasType(model: IModel, modelType: Type.Proxy): model is ProxyExports.IProxyModel;
    modelHasType(model: IModel, modelType: Type.Spacer): model is SpacerExports.ISpacerModel;
    modelHasType(model: IModel, modelType: Type.VisualCursor):
        model is VisualCursorExports.IVisualCursorModel;
    modelHasType(model: IModel, modelType: Type.Barline): model is (Barline & IModel);
    modelHasType(model: IModel, ...modelTypes: Type[]): boolean;

    /**
     * Filters models starting at idx for models of the given type.
     */
    search: (models: IModel[], idx: number, ...types: Type[]) => IModel[];

    /**
     * Convienience function that returns the print information for the given measure.
     *
     * Invariant: document must be validated.
     */
    getPrint: (startMeasure: number) => Print;

    /**
     * Returns an SVG of the page starting at startMeasure.
     */
    renderToStaticMarkup: (startMeasure: number) => string;

    /**
     * Convienience function that returns the position of top of the given page.
     *
     * Invariant: document must be validated.
     */
    getTop: (measureNum: number, pageNum: number) => number;
}

/**
 * Models a document in a certain state. Songs wrap documents to support change tracking.
 * Songs should not be mutated by user code.
 */
export class Document implements IDocument {
    error: Error;
    header: ScoreHeader;
    measures: IMeasure[];
    parts: string[];
    _visualCursor: any;
    modelHasType(model: IModel, modelType: Type.Chord): model is (IChord & IModel);
    modelHasType(model: IModel, modelType: Type.Print): model is (Print & IModel);
    modelHasType(model: IModel, modelType: Type.Grouping): model is (Grouping & IModel);
    modelHasType(model: IModel, modelType: Type.FiguredBass): model is (FiguredBass & IModel);
    modelHasType(model: IModel, modelType: Type.Attributes): model is (Attributes & IModel);
    modelHasType(model: IModel, modelType: Type.Sound): model is (Sound & IModel);
    modelHasType(model: IModel, modelType: Type.Direction): model is (Direction & IModel);
    modelHasType(model: IModel, modelType: Type.Harmony): model is (Harmony & IModel);
    modelHasType(model: IModel, modelType: Type.Proxy): model is ProxyExports.IProxyModel;
    modelHasType(model: IModel, modelType: Type.Spacer): model is SpacerExports.ISpacerModel;
    modelHasType(model: IModel, modelType: Type.VisualCursor):
        model is VisualCursorExports.IVisualCursorModel;
    modelHasType(model: IModel, modelType: Type.Barline): model is (Barline & IModel);
    modelHasType(model: IModel, ...modelTypes: Type[]): boolean;
    modelHasType(model: IModel, ...modelTypes: Type[]): boolean {
        throw new Error("Not ready");
    }
    _modelHasType: (model: IModel, ...modelTypes: Type[]) => boolean;
    search: (models: IModel[], idx: number, ...types: Type[]) => IModel[];

    getPrint(startMeasure: number): Print {
        let firstMeasure = this.measures[startMeasure];
        if (!firstMeasure) {
            throw new Error("No such measure " + startMeasure);
        }
        let partWithPrint = find(firstMeasure.parts, part => !!part.staves[1] &&
                this.search(part.staves[1], 0, Type.Print).length);

        if (partWithPrint) {
            return <any> this.search(partWithPrint.staves[1], 0, Type.Print)[0];
        }

        throw new Error("Part does not contain a Print element at division 0. Is it validated?");
    }

    renderToStaticMarkup(startMeasure: number): string {
        let top = this.getTop(0, 0);
        let memo$ = newLayoutState(top);
        const core = renderToStaticMarkup(
            this.__getPage(startMeasure, memo$, false, "svg-export", null, false));

        return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>${
            core.replace("<svg", "<svg xmlns=\"http://www.w3.org/2000/svg\"")
                .replace(/class="tn_"/g, "font-family='Alegreya'")
                .replace(/class="mmn_"/g, "font-family='Alegreya' " +
                            "font-style='italic' stroke='#7a7a7a'")
                .replace(/class="bn_"/g, "font-family='Alegreya' " +
                        "font-style='italic' text-anchor='end' stroke='#7a7a7a'")
                .replace(/<noscript><\/noscript>/g, "")}`;
    }

    getTop(measureNum: number, pageNum: number): number {
        let print = this.getPrint(measureNum);
        const pageMarginsAll = print.pageLayout.pageMargins;
        const pageMargins = getPageMargins(pageMarginsAll, pageNum);

        return print.pageLayout.pageHeight -
            (print.systemLayout.topSystemDistance +
                pageMargins.topMargin);
    }

    /**
     * INTERNAL. Renders a page. Instead, use renderToStaticMarkup() or the
     * functions provided in Song.
     *
     * Invariant: document must be validated.
     */
    __getPage: (startMeasure: number, memo$: ILinesLayoutState, preview: boolean,
        renderTarget?: "svg-web" | "svg-export", pageClassName?: string, singleLineMode?: boolean,
        onOperationsAppended?: (ops: IAny[]) => void,
        ref?: (svg: SVGSVGElement) => void) => ReactElement<any>;

    constructor(header: ScoreHeader, measures: IMeasure[], parts: string[],
            internalFactory: IFactory, error?: Error) {

        if (error) {
            this.error = error;
            return;
        };
        this.header = header;
        this.measures = measures;

        this.modelHasType = ((model: IModel, ...modelTypes: Type[]) =>
            internalFactory.modelHasType(model, ...modelTypes)) as any;

        this.search = (models: IModel[], idx: number, ...types: Type[]) =>
            internalFactory.search(models, idx, ...types);

        this.__getPage = (startMeasure: number,
                memo$: ILinesLayoutState, preview: boolean, renderTarget = "svg-export",
                pageClassName = "", singleLineMode?: boolean,
                onOperationsAppended?: (ops: IAny[]) => void,
                ref?: (svg: SVGSVGElement) => void): ReactElement<any> => {

            let print = this.getPrint(startMeasure);

            const pageNum = 1; // FIXME

            let opts: ILayoutOptions = {
                document: this,
                attributes: {},
                debug: true,
                header: this.header,
                measures: this.measures,
                modelFactory: internalFactory,
                page$: pageNum,
                postprocessors: internalFactory.postprocessors,
                preprocessors: [],
                print$: print,
                preview,
                singleLineMode,
                fixup: onOperationsAppended ? (segment, patch) => {
                    onOperationsAppended(patch);
                } : null,
            };

            validate(opts, memo$);
            const lineLayouts = layoutSong(opts, memo$);

            return $PageView({
                className: pageClassName,
                lineLayouts: lineLayouts,
                print: print,
                renderTarget: renderTarget,
                scoreHeader: this.header,
                singleLineMode,
                svgRef: ref,
            });
        };
    }
}
