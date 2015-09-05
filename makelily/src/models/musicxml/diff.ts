/**
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

"use strict";

import {compare} from "fast-json-patch";
import {clone, cloneDeep, find} from "lodash";

import Engine from "../../engine";
import Measure from "./measure";
import Options from "./options";

function createDiff(options: Options.ILayoutOptions, memo: Options.ILinesLayoutState,
            measureUUID: number, mutator: (measure$: Measure.IMutableMeasure) => void) {

    let newMemo = cloneDeep(memo);
    let newOptions = clone(options);

    delete newMemo.clean$[measureUUID];
    delete newMemo.width$[measureUUID];
    // TODO clone measure
    mutator(find(newOptions.measures, {"uuid": measureUUID}));

    Engine.validate$(newOptions, newMemo);
    return compare(options.measures, newOptions.measures);
}

export default createDiff;
