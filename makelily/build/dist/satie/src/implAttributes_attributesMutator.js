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
import { mutate, parentExists } from "./private_mutate";
export default function attributesMutator(_preview, attributes, op) {
    // Check if we are being asked to clone & create.
    if (!parentExists(attributes, op.p)) {
        console.warn("Invalid patch -- it's likely to a " +
            "model that only exists in a snapshot. You'll need to explicitly create it.");
        return;
    }
    // Bye.
    mutate(attributes, op);
}
//# sourceMappingURL=implAttributes_attributesMutator.js.map