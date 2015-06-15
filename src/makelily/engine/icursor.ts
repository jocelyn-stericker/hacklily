/** 
 * (C) Josh Netterfield <joshua@nettek.ca> 2015.
 * Part of the Satie music engraver <https://github.com/ripieno/satie>.
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

"use strict";

import MusicXML = require("musicxml-interfaces");

import Context from "./context";
import IModel from "./imodel";
import {ISegment} from "./measure";

interface ICursor {
    segment: ISegment;
    idx$: number;

    voice: Context.IVoice;
    staff: Context.IStaff;
    measure: Context.IMeasure;
    line: Context.ILine;

    /** 
     * Model that appears directly before this model. This could be:
     *  - the previous model in the current voice
     *  - the previous model in the current staff
     *  - a BarlineModel, BeginModel, or EndModel
     */
    prev$: IModel;
    division$: number;
    x$: number;
    print$: MusicXML.Print;
    header: MusicXML.ScoreHeader;
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
    factory: IModel.IFactory;

    hiddenCounter$?: number;
}

module ICursor {
    export function curr(cursor: ICursor): IModel {
        return cursor.segment[cursor.idx$] || null;
    }

    export function next(cursor: ICursor): IModel {
        return cursor.segment[cursor.idx$ + 1] || null;
    }

    export function splice$(cursor$: ICursor, idx: number, toRemove: number, toAdd?: IModel[]) {
        Array.prototype.splice.apply(cursor$.segment,
            [idx, toRemove].concat(<any>toAdd || []));
    }
}

export default ICursor;
