/**
 * This file is part of Satie music engraver <https://github.com/jnetterf/satie>.
 * Copyright (C) Joshua Netterfield <joshua.ca> 2015 - present.
 *
 * Satie is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * Satie is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Satie.  If not, see <http://www.gnu.org/licenses/>.
 */
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
