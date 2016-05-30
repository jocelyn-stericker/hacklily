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

import * as invariant from "invariant";
import {IAny, IListInsert} from "musicxml-interfaces/operations";

import ISegment from "../document/segment";
import OwnerType from "../document/ownerTypes";

import IFactory from "../private/factory";
import ILinesLayoutState from "../private/linesLayoutState";

export default function segmentMutator(factory: IFactory, memo$: ILinesLayoutState,
        segment: ISegment, op: IAny) {
    const {part, ownerType} = segment; // p[2]

    invariant(op.p[1] === "parts", "Malformed path.");
    invariant(op.p[2] === part, "Invalid pixup part.");
    invariant(op.p[3] === "voices" || op.p[3] === "staves",
        "Only voice and staff fixups are supported.");
    invariant(op.p[3] === "voices" && ownerType === OwnerType.Voice ||
        op.p[3] === "staves" && ownerType === OwnerType.Staff, "Type/path mismatch");

    if ("li" in op && !("ld" in op)) {
        let liop = op as IListInsert<any>;
        segment.splice(op.p[5] as number, 0, factory.fromSpec(liop.li));
    } else if ("ld" in op && !("li" in op)) {
        // Note: we don't check if op.ld is valid
        segment.splice(op.p[5] as number, 1);
    } else {
        invariant(false, "Unsupported operation type");
    }
}

