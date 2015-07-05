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

import {partialRight, isArray, isDate, merge} from "lodash";

let defaultsDeep = partialRight(merge, function recursiveDefaults(...args: any[]): any {
    // Ensure dates and arrays are not recursively merged
    if (isArray(args[0]) || isArray(args[1])) {
        return (args[0] || []).concat(args[1] || []);
    } else if (isDate(args[0])) {
        return args[0];
    }
    return merge(args[0], args[1], recursiveDefaults);
});

export default defaultsDeep;
