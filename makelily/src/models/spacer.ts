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

import Engine = require("./engine");

class SpacerModel implements Export.ISpacerModel {

    /*---- I.1 IModel ---------------------------------------------------------------------------*/

    /** @prototype only */
    divCount: number;

    /** defined externally */
    staffIdx: number;

    /** @prototype */
    frozenness: Engine.IModel.FrozenLevel;

    modelDidLoad$(segment$: Engine.Measure.ISegment): void {
        // Nothing to do
    }

    validate$(cursor$: Engine.ICursor): void {
        // Nothing to do
    }

    layout(cursor$: Engine.ICursor): Export.ILayout {
        return new SpacerModel.Layout(this, cursor$);
    }

    /*---- Validation Implementations -----------------------------------------------------------*/

    constructor(target: Engine.IModel) {
        this._target = target;
    }

    toXML(): string {
        return `<!-- spacer: ${this.divCount} divs -->\n`;
    }

    inspect() {
        return this.toXML();
    }

    _target: Engine.IModel;
}

module SpacerModel {
    export class Layout implements Export.ILayout {
        constructor(model: SpacerModel, cursor$: Engine.ICursor) {
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

        mergePolicy: Engine.IModel.HMergePolicy;
        boundingBoxes$: Engine.IModel.IBoundingRect[];
        renderClass: Engine.IModel.Type;
        expandPolicy: Engine.IModel.ExpandPolicy;
    }

    Layout.prototype.mergePolicy = Engine.IModel.HMergePolicy.Min;
    Layout.prototype.expandPolicy = Engine.IModel.ExpandPolicy.None;
    Layout.prototype.renderClass = Engine.IModel.Type.Spacer;
    Layout.prototype.boundingBoxes$ = [];
    Object.freeze(Layout.prototype.boundingBoxes$);
}

SpacerModel.prototype.divCount = 0;
SpacerModel.prototype.frozenness = Engine.IModel.FrozenLevel.Warm;

/**
 * Registers Spacer in the factory structure passed in.
 */
function Export(constructors: { [key: number]: any }) {
    constructors[Engine.IModel.Type.Spacer] = SpacerModel;
}

module Export {
    export interface ISpacerModel extends Engine.IModel {
    }

    export interface ILayout extends Engine.IModel.ILayout {
        model: ISpacerModel;
    }
}

export = Export;
