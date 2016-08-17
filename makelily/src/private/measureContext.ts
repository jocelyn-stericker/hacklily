/**
 * @source: https://github.com/jnetterf/satie/
 *
 * @license
 * (C) Josh Netterfield <joshua@nettek.ca> 2015.
 * Part of the Satie music engraver <https://github.com/jnetterf/satie>.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import IMeasure from "../document/measure";

import IAttributesSnapshot from "./attributesSnapshot";

interface IMeasureContext {
    /** 
     * The index of a given bar, starting from 0. This may not be the same as number.
     */
    idx: number;

    /** 
     * The string that is displayed at the start of the measure in some cases.
     */
    number: string;

    /** 
     * If true, the measure number should never be rendered.
     */
    implicit: boolean;

    /** 
     * If true, this measure does not start at beat 0 of other parts.
     * 
     * Satie does not support this attribute yet. It is here so we don't lose information when
     * we load and save from MusicXML.
     */
    nonControlling: boolean;

    /** 
     * Starting position.
     */
    x: number;

    /** 
     * Attributes from previous measure.
     */
    attributes: IAttributesSnapshot;

    /** 
     * A string uniquely identifying this bar, for collaboration
     * among other things.
     */
    uuid: number;

    parent: IMeasure;

    /**
     * Incremented whenever anything in the measure changes.
     * Local only and monotonic.
     */
    version: number;
}

export default IMeasureContext;

export function detachMeasureContext(measure: IMeasure, x: number): IMeasureContext {
    return {
        idx: measure.idx,
        uuid: measure.uuid,

        implicit: measure.implicit,
        attributes: null,
        nonControlling: measure.nonControlling,
        number: measure.number,
        x: x,

        parent: measure,
        version: measure.version
    };
}
