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
import { ReactElement } from "react";
import { ScoreHeader, Print, Grouping, FiguredBass, Attributes, Sound, Direction, Harmony, Barline } from "musicxml-interfaces";
import { IAny } from "musicxml-interfaces/operations";
import ProxyExports from "./implProxy_proxyModel";
import SpacerExports from "./implSpacer_spacerModel";
import VisualCursorExports from "./implVisualCursor_visualCursorModel";
import { IFactory } from "./private_factory";
import { IAttributesSnapshot } from "./private_attributesSnapshot";
import { IChord } from "./private_chordUtil";
import { ILinePlacementHint } from "./engine_processors_layout";
import { IMeasure } from "./document_measure";
import { IModel } from "./document_model";
import Type from "./document_types";
export { ISegment, IMeasurePart, IMeasure, getMeasureSegments, reduceToShortestInSegments } from "./document_measure";
export { IModel, generateModelKey, ILayout, detach } from "./document_model";
export { IMouseEvent, IProps, IPatchSpec, specIsRaw, specIsDocBuilder, specIsPartBuilder, ISong, ISongClass } from "./document_song";
export { default as Type } from "./document_types";
import { IMeasureLayout } from "./private_measureLayout";
export interface ICleanlinessTracking {
    measures: {
        [measure: string]: {
            /** x is cleared whenever rerendering a dirty measure not in preview mode */
            x: {
                [part: string]: {
                    [voice: number]: {
                        voiceX: number[];
                        staffX: {
                            [staff: number]: number[];
                        };
                    };
                };
            };
            clean: IMeasureLayout;
            layout: IMeasureLayout;
        };
    };
    lines: number[][];
    linePlacementHints: ReadonlyArray<ILinePlacementHint>;
}
/**
 * Models a document in a certain state. Songs wrap documents to support change tracking.
 * Songs should not be mutated by user code.
 */
export declare class Document {
    error: Error;
    header: ScoreHeader;
    measures: IMeasure[];
    parts: string[];
    _visualCursor: any;
    private _factory;
    modelHasType(model: IModel, modelType: Type.Chord): model is IChord & IModel;
    modelHasType(model: IModel, modelType: Type.Print): model is Print & IModel;
    modelHasType(model: IModel, modelType: Type.Grouping): model is Grouping & IModel;
    modelHasType(model: IModel, modelType: Type.FiguredBass): model is FiguredBass & IModel;
    modelHasType(model: IModel, modelType: Type.Attributes): model is Attributes & IModel & {
        _snapshot: IAttributesSnapshot;
    };
    modelHasType(model: IModel, modelType: Type.Sound): model is Sound & IModel;
    modelHasType(model: IModel, modelType: Type.Direction): model is Direction & IModel;
    modelHasType(model: IModel, modelType: Type.Harmony): model is Harmony & IModel;
    modelHasType(model: IModel, modelType: Type.Proxy): model is ProxyExports.IProxyModel;
    modelHasType(model: IModel, modelType: Type.Spacer): model is SpacerExports.ISpacerModel;
    modelHasType(model: IModel, modelType: Type.VisualCursor): model is VisualCursorExports.IVisualCursorModel;
    modelHasType(model: IModel, modelType: Type.Barline): model is Barline & IModel;
    modelHasType(model: IModel, ...modelTypes: Type[]): boolean;
    search(models: IModel[], idx: number, modelType: Type.Chord): (IChord & IModel)[];
    search(models: IModel[], idx: number, modelType: Type.Print): (Print & IModel)[];
    search(models: IModel[], idx: number, modelType: Type.Grouping): (Grouping & IModel)[];
    search(models: IModel[], idx: number, modelType: Type.FiguredBass): (FiguredBass & IModel)[];
    search(models: IModel[], idx: number, modelType: Type.Attributes): (Attributes & IModel)[];
    search(models: IModel[], idx: number, modelType: Type.Sound): (Sound & IModel)[];
    search(models: IModel[], idx: number, modelType: Type.Direction): (Direction & IModel)[];
    search(models: IModel[], idx: number, modelType: Type.Harmony): (Harmony & IModel)[];
    search(models: IModel[], idx: number, modelType: Type.Proxy): ProxyExports.IProxyModel[];
    search(models: IModel[], idx: number, modelType: Type.Spacer): SpacerExports.ISpacerModel[];
    search(models: IModel[], idx: number, modelType: Type.VisualCursor): VisualCursorExports.IVisualCursorModel[];
    search(models: IModel[], idx: number, ...types: Type[]): IModel[];
    getPrint(startMeasure: number): Print;
    renderToStaticMarkup(startMeasure: number): string;
    /**
     * INTERNAL. Renders a page. Instead, use renderToStaticMarkup() or the
     * functions provided in Song.
     *
     * Invariant: document must be validated.
     */
    __getPage(startMeasure: number, preview: boolean, renderTarget?: "svg-web" | "svg-export", pageClassName?: string, singleLineMode?: boolean, fixedMeasureWidth?: number, onOperationsAppended?: (ops: IAny[]) => void, ref?: (svg: SVGSVGElement) => void, onPageHeightChanged?: (height: number) => void): ReactElement<any>;
    constructor(header: ScoreHeader, measures: IMeasure[], parts: string[], internalFactory: IFactory, error?: Error);
    cleanlinessTracking: ICleanlinessTracking;
}
