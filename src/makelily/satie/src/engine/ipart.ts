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

import {any, filter} from "lodash";
import {PartList, PartGroup, ScorePart, StartStop} from "musicxml-interfaces";

module IPart {

export function scoreParts(scoreParts: PartList): ScorePart[] {
    return <ScorePart[]> filter(scoreParts, scorePart => scorePart._class === "ScorePart");
}

export function groupsForPart(scoreParts: PartList, partID: string): PartGroup[] {
    let groups: PartGroup[] = [];

    any(scoreParts, partOrGroup => {
        if (partOrGroup._class === "PartGroup") {
            let group = <PartGroup> partOrGroup;
            if (group.type === StartStop.Start) {
                groups.push(group);
            } else {
                groups = filter(groups, currGroup => currGroup.number !== group.number);
            }
        } else {
           let part = <ScorePart> partOrGroup;
           if (part.id === partID) {
               return true;
           }
        }
    });

    return groups;
}

}

export default IPart;
