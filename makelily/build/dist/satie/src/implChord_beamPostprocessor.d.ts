import { IMeasureLayout } from "./private_measureLayout";
import { ILayoutOptions } from "./private_layoutOptions";
import { ILineBounds } from "./private_lineBounds";
/**
 * Lays out measures within a bar & justifies.
 *
 * @returns new end of line
 */
declare function beam(options: ILayoutOptions, bounds: ILineBounds, measures: IMeasureLayout[]): IMeasureLayout[];
export default beam;
