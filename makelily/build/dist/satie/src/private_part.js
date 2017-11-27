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
var musicxml_interfaces_1 = require("musicxml-interfaces");
function scoreParts(scoreParts) {
    return lodash_1.filter(scoreParts, function (scorePart) { return scorePart._class === "ScorePart"; });
}
exports.scoreParts = scoreParts;
function groupsForPart(scoreParts, partID) {
    var groups = [];
    lodash_1.some(scoreParts, function (partOrGroup) {
        if (partOrGroup._class === "PartGroup") {
            var group_1 = partOrGroup;
            if (group_1.type === musicxml_interfaces_1.StartStop.Start) {
                groups.push(group_1);
            }
            else {
                groups = lodash_1.filter(groups, function (currGroup) { return currGroup.number !== group_1.number; });
            }
        }
        else {
            var part = partOrGroup;
            if (part.id === partID) {
                return true;
            }
        }
        return false;
    });
    return groups;
}
exports.groupsForPart = groupsForPart;
//# sourceMappingURL=private_part.js.map