/**
 * This file is part of Satie music engraver <https://github.com/emilyskidsister/satie>.
 * Copyright (C) Jocelyn Stericker <jocelyn@nettek.ca> 2015 - present.
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
import { map, mapValues } from "lodash";
import { detach as detachLayout } from "./document";
export function detach(layout) {
    var clone = {
        attributes: layout.attributes,
        print: layout.print,
        elements: map(layout.elements, function (v) { return map(v, detachLayout); }),
        width: layout.width,
        maxDivisions: layout.maxDivisions,
        originX: layout.originX,
        originY: mapValues(layout.originY, function (origins) { return origins.slice(); }),
        paddingTop: layout.paddingTop.slice(),
        paddingBottom: layout.paddingBottom.slice(),
        getVersion: layout.getVersion,
        uuid: layout.uuid,
    };
    return clone;
}
//# sourceMappingURL=private_measureLayout.js.map