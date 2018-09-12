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
import { IAny } from "musicxml-interfaces/operations";
import { ScoreHeader, Print } from "musicxml-interfaces";
import { Document, IMeasure, ISegment } from "./document";
import { IAttributesSnapshot } from "./private_attributesSnapshot";
import { IFactory } from "./private_factory";
import { IMeasureLayout } from "./private_measureLayout";
export interface IMeasureLayoutOptions {
    document: Document;
    header: ScoreHeader;
    measure: IMeasure;
    print: Print;
    x: number;
    lineShortest: number;
    lineBarOnLine: number;
    lineTotalBarsOnLine: number;
    lineIndex: number;
    lineCount: number;
    singleLineMode: boolean;
    factory: IFactory;
    preview: boolean;
    attributes: {
        [key: string]: IAttributesSnapshot[];
    };
    fixup: (segment: ISegment, operations: IAny[]) => void;
}
/**
 * Given a bunch of segments and the context (measure, line), returns information needed to lay the
 * models out. Note that the order of the output is arbitrary and may not correspond to the order
 * of the input segments.
 *
 * @segments Models to lay out or validate.
 * @measure Model to which the model belongs to.
 * @line Line context
 *
 * Complexity: O(staff-voice pairs)
 */
export declare function refreshMeasure(spec: IRefreshMeasureOpts): IMeasureLayout;
export declare enum RefreshMode {
    RefreshModel = 0,
    RefreshLayout = 1
}
export interface IRefreshMeasureOpts {
    document: Document;
    print: Print;
    factory: IFactory;
    header: ScoreHeader;
    measure: IMeasure;
    measureX: number;
    segments: ISegment[];
    singleLineMode: boolean;
    attributes: {
        [part: string]: IAttributesSnapshot[];
    };
    lineShortest: number;
    lineBarOnLine: number;
    lineTotalBarsOnLine: number;
    lineIndex: number;
    lineCount: number;
    noAlign?: boolean;
    mode: RefreshMode;
    preview: boolean;
    fixup: (segment: ISegment, operations: IAny[], restartRequired: boolean) => void;
}
/**
 * Given the context and constraints given, creates a possible layout for items within a measure.
 *
 * @param opts structure with __normalized__ voices and staves
 * @returns an array of staff and voice layouts with an undefined order
 */
export declare function layoutMeasure({ document, header, print, measure, factory, x, singleLineMode, preview, fixup, lineShortest, lineBarOnLine, lineTotalBarsOnLine, lineIndex, lineCount, attributes, }: IMeasureLayoutOptions): IMeasureLayout;
