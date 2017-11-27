import { IMeasureLayout } from "./private_measureLayout";
import { ILayoutOptions } from "./private_layoutOptions";
import { ILineBounds } from "./private_lineBounds";
declare function removeOverlaps(options: ILayoutOptions, bounds: ILineBounds, measures: IMeasureLayout[]): IMeasureLayout[];
export default removeOverlaps;
