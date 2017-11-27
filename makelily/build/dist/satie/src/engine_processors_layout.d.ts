import { IMeasure } from "./document";
import { ILayoutOptions } from "./private_layoutOptions";
import { IMeasureLayout } from "./private_measureLayout";
export interface ILinePlacementHint {
    widthByShortest: {
        [key: number]: number;
    };
    shortestCount: number;
    attributesWidthStart: number;
    attributesWidthEnd: number;
}
export declare function getApproximateMeasureWidth(measure: IMeasure, shortest: number): number;
export default function layoutSong(options: ILayoutOptions): IMeasureLayout[][];
