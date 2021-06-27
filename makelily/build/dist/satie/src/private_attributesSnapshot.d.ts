/**
 * This file is part of Satie music engraver <https://github.com/emilyskidsister/satie>.
 * Copyright (C) Jocelyn Stericker <jocelyn@nettek.ca> 2015 - present.
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
import { Attributes, PartSymbol, Clef, Time, StaffDetails, Transpose, Key, Directive, MeasureStyle } from "musicxml-interfaces";
/**
 * A snapshot of the current attribute state
 */
export interface IAttributesSnapshot extends Attributes {
    measure: number;
    divisions: number;
    partSymbol: PartSymbol;
    clefs: Clef[];
    times: Time[];
    transposes: Transpose[];
    keySignatures: Key[];
    clef: Clef;
    measureStyle: MeasureStyle & {
        multipleRestInitiatedHere?: boolean;
    };
    time: Time;
    staffDetails: StaffDetails[];
    transpose: Transpose;
    staves: number;
    instruments: string;
    keySignature: Key;
    directives: Directive[];
}
export interface IAttributesSnapshotSpec {
    before: IAttributesSnapshot;
    current: Attributes;
    staff: number;
    measure: number;
}
export declare function createAttributesSnapshot({ before, current, staff, measure, }: IAttributesSnapshotSpec): IAttributesSnapshot;
