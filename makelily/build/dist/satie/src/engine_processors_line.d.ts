import { ILayoutOptions } from "./private_layoutOptions";
import { ILineBounds } from "./private_lineBounds";
import { IMeasureLayout } from "./private_measureLayout";
import { IAttributesSnapshot } from "./private_attributesSnapshot";
export declare function layoutLine(options: ILayoutOptions, bounds: ILineBounds, memo: {
    y: number;
    attributes: {
        [part: string]: IAttributesSnapshot[];
    };
}): IMeasureLayout[];
