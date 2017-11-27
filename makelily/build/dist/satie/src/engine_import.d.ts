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
/**
 * @file models/musicxml/import.ts tools for converting MXMLJSON to SatieJSON
 */
import { ScoreTimewise } from "musicxml-interfaces";
import { Document } from "./document";
import { IMeasure } from "./document";
import { IFactory } from "./private_factory";
import ScoreHeader from "./engine_scoreHeader";
export declare function stringToDocument(src: string, factory: IFactory): Document;
/**
 * Converts a timewise MXMLJSON score to an uninitialized Satie score.
 * See also Models.importXML.
 *
 * @param score produced by github.com/jnetterf/musicxml-interfaces
 * @returns A structure that can be consumed by a score. If an error occurred
 *          error will be set, and all other properties will be null.
 */
export declare function timewiseStructToDocument(score: ScoreTimewise, factory: IFactory): Document;
export declare function _extractMXMLHeader(m: ScoreTimewise): ScoreHeader;
export declare function _extractMXMLPartsAndMeasures(input: ScoreTimewise, factory: IFactory): {
    measures?: IMeasure[];
    parts?: string[];
    error?: string;
};
/**
 * Parses a MusicXML document and returns a Document.
 */
export declare function importXML(src: string, cb: (error: Error, document?: Document, factory?: IFactory) => void): void;
