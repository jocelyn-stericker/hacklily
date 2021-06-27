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
import invariant from "invariant";
import { isEqual } from "lodash";
import { cloneObject } from "./private_util";
export default function segmentMutator(factory, segment, op, doc) {
    var part = segment.part, ownerType = segment.ownerType; // p[2]
    invariant(op.p.length === 6, "Invalid length for segment operation.");
    invariant(op.p[1] === "parts", "Malformed path.");
    invariant(op.p[2] === part, "Invalid fixup part.");
    invariant(op.p[3] === "voices" || op.p[3] === "staves", "Only voice and staff fixups are supported.");
    invariant((op.p[3] === "voices" && ownerType === "voice") ||
        (op.p[3] === "staves" && ownerType === "staff"), "Type/path mismatch");
    if ("li" in op && !("ld" in op)) {
        var liop = op;
        var newModel = factory.fromSpec(liop.li);
        if (liop.li._class === "VisualCursor") {
            doc._visualCursor = newModel;
        }
        segment.splice(op.p[5], 0, newModel);
    }
    else if ("ld" in op && !("li" in op)) {
        var existingSerializable = cloneObject(segment[op.p[5]]);
        var ld = cloneObject(op.ld);
        if (!isEqual(existingSerializable, ld)) {
            console.warn("The element to be removed should be accurately specified in the operation.\n\n" +
                "OPERATION SPEC: " +
                JSON.stringify(ld, null, 2) +
                "\n\n" +
                "ACTUAL SPEC: " +
                JSON.stringify(existingSerializable, null, 2) +
                "\n\n" +
                "Your patch is broken.");
        }
        segment.splice(op.p[5], 1);
    }
    else {
        throw new Error("Unsupported operation type");
    }
}
//# sourceMappingURL=implSegment_segmentMutator.js.map