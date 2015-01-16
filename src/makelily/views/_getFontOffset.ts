/**
 * (C) Josh Netterfield <joshua@nettek.ca> 2015.
 * Part of the Satie music engraver <https://github.com/ripieno/satie>.
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

"use strict";

import _            = require("lodash");
import assert       = require("assert");

import C            = require("../stores/contracts");

var    getAnchor    = _.memoize((notehead: string) =>
                        (<any>C.SMuFL.bravuraMetadata.glyphsWithAnchors)[notehead]);

/**
 * Used as a sort of "mixin" to calculate where an annotation of a note
 * should begin based on the direction of the note stem and the type of
 * annotation.
 */
function getFontOffset(notehead?: string, directionMult?: number) {
    notehead        = notehead || this.props.notehead;
    var dm          = directionMult || 1;
    var anchors     = getAnchor(notehead);

    switch (true) {
        case !anchors:
            return [0, 0];
        case this.direction()*dm === 1:
            return anchors.stemUpSE  || anchors.stemUpNW;
        case this.direction()*dm === -1:
            return anchors.stemDownNW || anchors.stemDownSW;
        default:
            assert(false, "Invalid direction");
    }
}

export = getFontOffset;
