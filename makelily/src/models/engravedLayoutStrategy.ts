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

import MusicXML = require("musicxml-interfaces");

import Engine from "../engine";

export class Layout implements Engine.IModel.ILayout {
    constructor(model: IEngravedModel, cursor$: Engine.ICursor,
            priority: Engine.IModel.Type, expandPolicy: Engine.IModel.ExpandPolicy) {
        this.model = model;
        this.priority = priority;
        this.x$ = model.defaultX + (model.defaultY || 0);
        this.division = cursor$.division$;
        if (expandPolicy) {
            this.expandPolicy = expandPolicy;
        }

        if (model.divCount === -1) {
            cursor$.division$ += cursor$.staff.totalDivisions;
        } else {
            cursor$.division$ += model.divCount;
        }

        cursor$.x$ += model.calcWidth();

    }

    /*---- Properties --------------------------------------------------------*/

    // Constructed:

    model: IEngravedModel;
    x$: number;
    division: number;
    priority: Engine.IModel.Type;

    // Prototype:

    mergePolicy: Engine.IModel.HMergePolicy;
    boundingBoxes$: Engine.IModel.IBoundingRect[];
    expandPolicy: Engine.IModel.ExpandPolicy;
}

Layout.prototype.mergePolicy = Engine.IModel.HMergePolicy.Min;
Layout.prototype.expandPolicy = Engine.IModel.ExpandPolicy.None;
Layout.prototype.boundingBoxes$ = [];
Object.freeze(Layout.prototype.boundingBoxes$);

export interface IEngravedModel extends Engine.IModel, MusicXML.Position {
    calcWidth(): number;
}
