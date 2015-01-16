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

import MusicXML         = require("musicxml-interfaces");

import Ctx              = require("./ctx");
import IModel           = require("./imodel");  // @circular
import Measure          = require("./measure"); // @circular

interface ICursor {
    segment: Measure.ISegment;
    idx$: number;

    voice: Ctx.IVoice;
    staff: Ctx.IStaff;
    measure: Ctx.IMeasure;
    line: Ctx.ILine;

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
    maxPaddingTop$: number;
    maxPaddingBottom$: number;

    approximate: boolean;
    detached: boolean;
    factory: IModel.IFactory;

    hiddenCounter$?: number;
}

module ICursor {
    export function curr(cursor: ICursor): IModel {
        return cursor.segment.models[cursor.idx$] || null;
    }

    export function next(cursor: ICursor): IModel {
        return cursor.segment.models[cursor.idx$ + 1] || null;
    }

    export function splice$(cursor$: ICursor, idx: number, toRemove: number, toAdd?: IModel[]) {
        Array.prototype.splice.apply(cursor$.segment.models,
            [idx, toRemove].concat(<any>toAdd || []));
    }
}

export = ICursor;
