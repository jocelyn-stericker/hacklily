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

import {Time} from "musicxml-interfaces";
import {reduce} from "lodash";
import * as invariant from "invariant";

/**
 * @returns a TS string for lookup in the BEAMING_PATTERNS array.
 */
export default function getTSString(time: Time) {
    invariant(!!time, "Expected time to be defined.");
    return reduce(time.beats, (memo, beats, idx) => {
        return beats + "/" + time.beatTypes[idx];

    }, "");
}
