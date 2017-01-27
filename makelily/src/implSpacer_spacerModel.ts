/**
 * @source: https://github.com/jnetterf/satie/
 *
 * @license
 * (C) Josh Netterfield <joshua@nettek.ca> 2015.
 * Part of the Satie music engraver <https://github.com/jnetterf/satie>.
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

import {IModel, ILayout, Type} from "./document";

import {IReadOnlyValidationCursor, LayoutCursor} from "./private_cursor";
import {IBoundingRect} from "./private_boundingRect";

class SpacerModel implements Export.ISpacerModel {
    _class = "Spacer";

    /*---- I.1 IModel ---------------------------------------------------------------------------*/

    divCount: number;

    /** @prototype only */
    divisions: number;

    /** defined externally */
    staffIdx: number;

    private _target: IModel;

    /*---- Implementation -----------------------------------------------------------------------*/

    constructor(target: IModel) {
        if (target) {
            this._target = target;
            this.divCount = target.divCount;
        }
    }

    toJSON() {
        let {_class, divCount} = this;
        return {
            _class,
            divCount,
        };
    }

    refresh(cursor: IReadOnlyValidationCursor): void {
        // Nothing to do
    }

    getLayout(cursor: LayoutCursor): Export.ISpacerLayout {
        return new SpacerModel.Layout(this, cursor);
    }

    toXML(): string {
        return `<!-- spacer -->\n<forward><duration>${this.divCount}</duration></forward>\n`;
    }

    inspect() {
        return this.toXML();
    }

    calcWidth(shortest: number) {
        return 0;
    }
}

module SpacerModel {
    export class Layout implements Export.ISpacerLayout {
        constructor(model: SpacerModel, cursor: LayoutCursor) {
            this.model = model;
            this.x = cursor.segmentX;
            this.division = cursor.segmentDivision;
            this.renderedWidth = 0;
        }

        /*---- ILayout ------------------------------------------------------*/

        // Constructed:

        model: SpacerModel;
        x: number;
        division: number;
        renderedWidth: number;

        // Prototype:

        boundingBoxes: IBoundingRect[];
        renderClass: Type;
        expandPolicy: "none";
    }

    Layout.prototype.expandPolicy = "none";
    Layout.prototype.renderClass = Type.Spacer;
    Layout.prototype.boundingBoxes = [];
    Object.freeze(Layout.prototype.boundingBoxes);
}

SpacerModel.prototype.divCount = 0;
SpacerModel.prototype.divisions = 0;

/**
 * Registers Spacer in the factory structure passed in.
 */
function Export(constructors: { [key: number]: any }) {
    constructors[Type.Spacer] = SpacerModel;
}

module Export {
    export interface ISpacerModel extends IModel {
    }

    export interface ISpacerLayout extends ILayout {
        model: ISpacerModel;
        renderedWidth: number;
    }
}

export default Export;
