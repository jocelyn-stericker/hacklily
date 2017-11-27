import { IAny } from "musicxml-interfaces/operations";
import { Document, ISegment } from "./document";
import { IFactory } from "./private_factory";
export default function segmentMutator(factory: IFactory, segment: ISegment, op: IAny, doc: Document): void;
