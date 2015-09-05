/**
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

import {ICursor, IModel, ISegment} from "../engine";

class SpacerModel implements Export.ISpacerModel {

    /*---- I.1 IModel ---------------------------------------------------------------------------*/

    /** @prototype only */
    divCount: number;

    /** defined externally */
    staffIdx: number;

    /** @prototype */
    frozenness: IModel.FrozenLevel;

    modelDidLoad$(segment$: ISegment): void {
        // Nothing to do
    }

    validate$(cursor$: ICursor): void {
        // Nothing to do
    }

    layout(cursor$: ICursor): Export.ILayout {
        return new SpacerModel.Layout(this, cursor$);
    }

    /*---- Validation Implementations -----------------------------------------------------------*/

    constructor(target: IModel) {
        this._target = target;
    }

    toXML(): string {
        return `<!-- spacer: ${this.divCount} divs -->\n`;
    }

    inspect() {
        return this.toXML();
    }

    _target: IModel;
}

module SpacerModel {
    export class Layout implements Export.ILayout {
        constructor(model: SpacerModel, cursor$: ICursor) {
            this.model = model;
            this.x$ = cursor$.x$;
            this.division = cursor$.division$;
        }

        /*---- ILayout ------------------------------------------------------*/

        // Constructed:

        model: SpacerModel;
        x$: number;
        division: number;

        // Prototype:

        boundingBoxes$: IModel.IBoundingRect[];
        renderClass: IModel.Type;
        expandPolicy: IModel.ExpandPolicy;
    }

    Layout.prototype.expandPolicy = IModel.ExpandPolicy.None;
    Layout.prototype.renderClass = IModel.Type.Spacer;
    Layout.prototype.boundingBoxes$ = [];
    Object.freeze(Layout.prototype.boundingBoxes$);
}

SpacerModel.prototype.divCount = 0;
SpacerModel.prototype.frozenness = IModel.FrozenLevel.Warm;

/**
 * Registers Spacer in the factory structure passed in.
 */
function Export(constructors: { [key: number]: any }) {
    constructors[IModel.Type.Spacer] = SpacerModel;
}

module Export {
    export interface ISpacerModel extends IModel {
    }

    export interface ILayout extends IModel.ILayout {
        model: ISpacerModel;
    }
}

export default Export;
