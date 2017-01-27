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

import {Feature, StartStopSingle, Grouping, serializeGrouping} from "musicxml-interfaces";
import {forEach} from "lodash";

import {IModel, ILayout, Type} from "./document";

import {IReadOnlyValidationCursor, LayoutCursor} from "./private_cursor";
import {IBoundingRect} from "./private_boundingRect";

class GroupingModel implements Export.IGroupingModel {

    /*---- I.1 IModel ---------------------------------------------------------------------------*/

    /** @prototype only */
    divCount: number;

    /** @prototype only */
    divisions: number;

    /** defined externally */
    staffIdx: number;

    /*---- I.2 Grouping -------------------------------------------------------------------------*/

    features: Feature[];
    number: number;
    type: StartStopSingle;
    memberOf: string;

    /*---- Implementation -----------------------------------------------------------------------*/

    constructor(spec: Grouping) {
        forEach<any>(spec, (value, key) => {
            (this as any)[key] = value;
        });
    }

    refresh(cursor: IReadOnlyValidationCursor): void {
        // todo
    }

    getLayout(cursor: LayoutCursor): Export.IGroupingLayout {
        // todo

        return new GroupingModel.Layout(this, cursor);
    }

    toXML(): string {
        return `${serializeGrouping(this)}\n<forward><duration>${this.divCount}</duration></forward>\n`;
    }

    inspect() {
        return this.toXML();
    }

    calcWidth(shortest: number) {
        return 0;
    }
}

GroupingModel.prototype.divCount = 0;
GroupingModel.prototype.divisions = 0;

module GroupingModel {
    export class Layout implements Export.IGroupingLayout {
        constructor(model: GroupingModel, cursor: LayoutCursor) {
            this.model = model;
            this.x = cursor.segmentX;
            this.division = cursor.segmentDivision;
        }

        /*---- ILayout ------------------------------------------------------*/

        // Constructed:

        model: GroupingModel;
        x: number;
        division: number;

        // Prototype:

        boundingBoxes: IBoundingRect[];
        renderClass: Type;
        expandPolicy: "none";
    }

    Layout.prototype.expandPolicy = "none";
    Layout.prototype.renderClass = Type.Grouping;
    Layout.prototype.boundingBoxes = [];
    Object.freeze(Layout.prototype.boundingBoxes);
};

/**
 * Registers Grouping in the factory structure passed in.
 */
function Export(constructors: { [key: number]: any }) {
    constructors[Type.Grouping] = GroupingModel;
}

module Export {
    export interface IGroupingModel extends IModel, Grouping {
    }

    export interface IGroupingLayout extends ILayout {
    }
}

export default Export;
