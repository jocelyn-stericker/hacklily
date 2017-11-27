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
 * @file engine/scoreHeader.ts holds default header information as well
 * as convienience utilites for score headers.
 */
import { ScoreHeader, Credit, Identification, Defaults, Work, PartList } from "musicxml-interfaces";
/**
 * A header is a child of parts, and includes the title and other basic
 * information.
 */
declare class ScoreHeaderModel implements ScoreHeader {
    credits: Credit[];
    identification: Identification;
    defaults: Defaults;
    work: Work;
    movementTitle: string;
    movementNumber: string;
    partList: PartList;
    composer: string;
    arranger: string;
    lyricist: string;
    title: string;
    constructor(spec: ScoreHeader);
    toXML(): string;
    inspect(): string;
    overwriteEncoding(): void;
    private _getIdentificationOrCredit(type);
    private _setIdentification(type, val);
    private _setCredits(type, val, justification, fontSize, top);
}
export default ScoreHeaderModel;
