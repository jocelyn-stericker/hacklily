import { IMeasureLayout } from "./private_measureLayout";
import { ILayoutOptions } from "./private_layoutOptions";
import { ILineBounds } from "./private_lineBounds";
/**
 * Centers elements marked as such
 *
 * @returns new end of line
 */
declare function center(options: ILayoutOptions, bounds: ILineBounds, measures: IMeasureLayout[]): IMeasureLayout[];
export default center;
