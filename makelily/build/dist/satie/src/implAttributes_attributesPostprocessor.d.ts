import { IMeasureLayout } from "./private_measureLayout";
import { ILayoutOptions } from "./private_layoutOptions";
import { ILineBounds } from "./private_lineBounds";
/**
 * Sets the width of attributes w.r.t. staff lines.
 *
 * @returns a list of measures
 */
declare function attributes(options: ILayoutOptions, bounds: ILineBounds, measures: IMeasureLayout[]): IMeasureLayout[];
export default attributes;
