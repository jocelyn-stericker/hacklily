"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
var private_util_1 = require("./private_util");
/**
 * Assigns a random key to an object, usually for React.
 */
function generateModelKey(model) {
    if (!model.key) {
        model.key = String(Math.floor(Math.random() * private_util_1.MAX_SAFE_INTEGER));
    }
}
exports.generateModelKey = generateModelKey;
function detach(layout) {
    layout.overrideX = NaN;
    return Object.create(layout, {
        x: {
            get: function () {
                return layout.overrideX || layout.x;
            },
            set: function (x) {
                layout.overrideX = x;
            }
        }
    });
}
exports.detach = detach;
//# sourceMappingURL=document_model.js.map