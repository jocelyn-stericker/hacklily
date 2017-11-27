import { Type, ILayout } from "./document";
export interface ICombinedLayout {
    x: number;
    division: number;
    renderClass: Type;
    expandPolicy?: "none" | "centered" | "after";
    renderedWidth?: number;
}
export declare function combineLayout(layout: ILayout): ICombinedLayout;
export declare function reattachLayout(layout: ICombinedLayout): ILayout;
/**
 * Helper to line up two streams that have some overlap.
 * Divisions in each segment must be the same.
 *
 * @code
 * let memo = reduce(segments, mergeSegmentsInPlace, []);
 * reduce(segments, mergeSegmentsInPlace, memo);
 */
export declare function mergeSegmentsInPlace(segment1: ICombinedLayout[], segment2: ILayout[]): ICombinedLayout[];
