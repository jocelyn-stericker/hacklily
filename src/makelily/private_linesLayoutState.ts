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

import {IMeasureLayout} from "./private_measureLayout";

export interface ILinePlacementState {
    width: number;
    attributesWidthStart: number;
    attributesWidthEnd: number;
    shortest: number;
    line: number;
}

export interface ILinesLayoutState {
    linePlacement$: { [key: string]: ILinePlacementState };
    multipleRests$: { [key: string]: number };
    clean$: { [key: string]: IMeasureLayout };
    reduced$: { [key: string]: IMeasureLayout[] };
    y$: number;
    shortest$: number;
}

export function markDirty(memo$: ILinesLayoutState, model: {key?: string}) {
    if (!model.key) {
        // Never marked clean, so cannot mark dirty!
        return;
    }
    let measure = model.key.split("_")[0].split("SATIE")[1];
    memo$.clean$[measure] = null;
}

export function newLayoutState(top: number): ILinesLayoutState {
    return {
        y$: top,
        linePlacement$: {},
        multipleRests$: {},
        clean$: {},
        reduced$: {},
        shortest$: 0,
    };
}
