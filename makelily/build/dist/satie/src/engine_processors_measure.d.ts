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
    RefreshLayout = 1,
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
export declare function layoutMeasure({document, header, print, measure, factory, x, singleLineMode, preview, fixup, lineShortest, lineBarOnLine, lineTotalBarsOnLine, lineIndex, lineCount, attributes}: IMeasureLayoutOptions): IMeasureLayout;
