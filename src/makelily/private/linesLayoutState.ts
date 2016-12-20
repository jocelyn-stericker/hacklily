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

import IMeasureLayout from "./measureLayout";
import ILineLayoutResult from "./lineLayoutResult";

export interface ILinePlacementState {
    width: number;
    attributesWidthStart: number;
    attributesWidthEnd: number;
    shortest: number;
    line: number;
}

interface ILinesLayoutState {
    linePlacement$: { [key: string]: ILinePlacementState };
    multipleRests$: { [key: string]: number };
    clean$: { [key: string]: IMeasureLayout };
    reduced$: { [key: string]: ILineLayoutResult };
    y$: number;
    shortest$: number;
}

export default ILinesLayoutState;

export function markDirty(memo$: ILinesLayoutState, model: {key: string}) {
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
