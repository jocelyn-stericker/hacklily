import { IFactory } from "./private_factory";
import { ISegment, Document } from "./document";
/**
 * Given a set of segments, scales divisions so that they are compatible.
 *
 * Returns the division count.
 */
export declare function normalizeDivisionsInPlace(factory: IFactory | Document, segments: ISegment[], factor?: number): number;
