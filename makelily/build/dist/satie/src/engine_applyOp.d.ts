import { IAny } from "musicxml-interfaces/operations";
import { Document, IMeasure } from "./document";
import { IFactory } from "./private_factory";
/**
 * Applies an operation to the given set of measures, usually part of a document.
 *
 * CAREFUL: Does not touch `appliedOperations` because this function can also be used for undo. It's
 * the caller's responsibility to update `appliedOperations`.
 *
 * @param op.p [measureUUID, ("part"|"voice")]
 */
export default function applyOp(preview: boolean, measures: IMeasure[], factory: IFactory, op: IAny, document: Document, notEligableForPreview: () => void): void;
export declare function applyMeasureOp(measures: IMeasure[], factory: IFactory, op: IAny, doc: Document): void;
