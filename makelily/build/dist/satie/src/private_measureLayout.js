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
var lodash_1 = require("lodash");
var document_1 = require("./document");
function detach(layout) {
    var clone = {
        attributes: layout.attributes,
        print: layout.print,
        elements: lodash_1.map(layout.elements, function (v) { return lodash_1.map(v, document_1.detach); }),
        width: layout.width,
        maxDivisions: layout.maxDivisions,
        originX: layout.originX,
        originY: lodash_1.mapValues(layout.originY, function (origins) { return origins.slice(); }),
        paddingTop: layout.paddingTop.slice(),
        paddingBottom: layout.paddingBottom.slice(),
        getVersion: layout.getVersion,
        uuid: layout.uuid
    };
    return clone;
}
exports.detach = detach;
//# sourceMappingURL=private_measureLayout.js.map