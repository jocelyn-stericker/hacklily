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
var musicxml_interfaces_1 = require("musicxml-interfaces");
function getPageMargins(pageMargins, page) {
    for (var i = 0; i < pageMargins.length; ++i) {
        if (pageMargins[i].type === musicxml_interfaces_1.OddEvenBoth.Both ||
            pageMargins[i].type === musicxml_interfaces_1.OddEvenBoth.Even && (page % 2 === 0) ||
            pageMargins[i].type === musicxml_interfaces_1.OddEvenBoth.Odd && (page % 2 === 1)) {
            return pageMargins[i];
        }
    }
    throw new Error("Invalid page margins");
}
exports.getPageMargins = getPageMargins;
//# sourceMappingURL=private_print.js.map