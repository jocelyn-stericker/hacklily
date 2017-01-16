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

import {IModel} from "./document_model";

export interface ISegment extends Array<IModel> {
    owner: number;
    ownerType: "staff" | "voice";
    divisions: number;
    part?: string;
}

export interface IMeasurePart {
    voices: ISegment[];
    staves: ISegment[];
}

/**
 * Based on MusicXML's Measure, but with additional information, and with a staff/voice-seperated and
 * monotonic parts element.
 */
export interface IMeasure {
    idx: number; // 0-indexed, can change
    uuid: number;
    number: string; // 1-indexed
    implicit?: boolean;
    width?: number;
    nonControlling?: boolean;
    parts: {
        [id: string]: IMeasurePart;
    };

    /**
     * Incremented whenever anything in the measure changes.
     * Local only and monotonic.
     */
    version: number;
};
