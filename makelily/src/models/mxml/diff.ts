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

"use strict";

import JSONPatch        = require("fast-json-patch");
import _                = require("lodash");

import EngineType       = require("../engine");
import Measure          = require("./measure");
import Options          = require("./options");

function createDiff(options: Options.ILayoutOptions, memo: Options.ILinesLayoutState,
            measureUUID: number, mutator: (measure$: Measure.IMutableMeasure) => void) {
    var Engine: typeof EngineType = require("../engine");

    var newMemo = _.cloneDeep(memo);
    var newOptions = _.clone(options);

    delete newMemo.clean$[measureUUID];
    delete newMemo.width$[measureUUID];
    // TODO clone measure
    mutator(_.find(newOptions.measures, {"uuid": measureUUID}));

    Engine.validate$(newOptions, newMemo);
    return JSONPatch.compare(options.measures, newOptions.measures);
}

export = createDiff;
