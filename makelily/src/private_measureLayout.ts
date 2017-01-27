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

import {Print} from "musicxml-interfaces";
import {map, mapValues} from "lodash";

import {IAttributesSnapshot} from "./private_attributesSnapshot";
import {ILayout, detach as detachLayout} from "./document";

export interface IMeasureLayout {
    attributes: {[part: string]: IAttributesSnapshot[]};
    print: Print;
    elements: ILayout[][];
    width: number;
    maxDivisions: number;
    uuid: number;
    originX: number;
    /**
     * Topmost (i.e., lowest) y-coordinates of each staff in tenths. One part may have more
     * than one staff.
     */
    originY: {[part: string]: number[]};
    /**
     * Positive integer in tenths. Required space above each staff beyond default 15 tenths,
     * indexed by staff index.
     */
    paddingTop: number[];
    /**
     * Postivie integer in tenths. Required space below each staff beyond default 15 tenths,
     * indexed by staff index.
     */
    paddingBottom: number[];

    getVersion: () => number;
}

export function detach(layout: IMeasureLayout) {
    let clone: IMeasureLayout = {
        attributes: layout.attributes,
        print: layout.print,
        elements: map(layout.elements, v => map(v, detachLayout)),
        width: layout.width,
        maxDivisions: layout.maxDivisions,
        originX: layout.originX,
        originY: mapValues(layout.originY, origins => origins.slice()),
        paddingTop: layout.paddingTop.slice(),
        paddingBottom: layout.paddingBottom.slice(),
        getVersion: layout.getVersion,
        uuid: layout.uuid
    };
    return clone;
};
