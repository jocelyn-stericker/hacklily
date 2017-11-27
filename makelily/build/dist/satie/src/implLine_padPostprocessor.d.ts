import { IMeasureLayout } from "./private_measureLayout";
import { ILayoutOptions } from "./private_layoutOptions";
import { ILineBounds } from "./private_lineBounds";
/**
 * Respects the minSpaceBefore and minSpaceAfter of elements. minSpaceBefore and minSpaceAfter
 * are used for things like lyrics.
 *
 * @returns new end of line
 */
declare function pad(options: ILayoutOptions, bounds: ILineBounds, measures: IMeasureLayout[]): IMeasureLayout[];
export default pad;
