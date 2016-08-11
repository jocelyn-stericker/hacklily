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

/**
 * @file engine/icursor.ts Interface of and tools for models.
 */

import {Print, ScoreHeader} from "musicxml-interfaces";
import {IAny} from "musicxml-interfaces/operations";
import {VoiceBuilder, StaffBuilder} from "../patch/createPatch";

import ISegment from "../document/segment";
import IDocument from "../document/document";

import IVoiceContext from "./voiceContext";
import IStaffContext from "./staffContext";
import IMeasureContext from "./measureContext";
import ILineContext from "./lineContext";
import IFactory from "./factory";

interface ICursor {
    document: IDocument;

    segment: ISegment;
    idx$: number;

    voice: IVoiceContext;
    staff: IStaffContext;
    measure: IMeasureContext;
    line: ILineContext;

    division$: number;
    x$: number;
    print$: Print;
    header: ScoreHeader;
    minXBySmallest$?: {[key: number]: number};
    /**
     * By staff
     */
    maxPaddingTop$: number[];
    /**
     * By staff
     */
    maxPaddingBottom$: number[];

    /**
     * Only available in second layout$
     */
    page$: number;

    approximate: boolean;
    detached: boolean;
    factory: IFactory;

    hiddenCounter$?: number;
    fixup: (operations: IAny[]) => void;
    patch: (builder: (partBuilder: VoiceBuilder & StaffBuilder) => (VoiceBuilder | StaffBuilder)) => void;
    advance: (divs: number) => void;
}

export default ICursor;
