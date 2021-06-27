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
import { MAX_SAFE_INTEGER } from "./private_util";
/**
 * Assigns a random key to an object, usually for React.
 */
export function generateModelKey(model) {
    if (!model.key) {
        model.key = String(Math.floor(Math.random() * MAX_SAFE_INTEGER));
    }
}
export function detach(layout) {
    layout.overrideX = NaN;
    return Object.create(layout, {
        x: {
            get: function () {
                return layout.overrideX || layout.x;
            },
            set: function (x) {
                layout.overrideX = x;
            },
        },
    });
}
//# sourceMappingURL=document_model.js.map