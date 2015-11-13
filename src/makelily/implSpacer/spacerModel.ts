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

import {IAny} from "musicxml-interfaces/operations";

import IModel from "../document/model";
import FrozenLevel from "../document/frozenLevels";
import ExpandPolicy from "../document/expandPolicies";
import Type from "../document/types";

import ICursor from "../private/cursor";
import IBoundingRect from "../private/boundingRect";
import ILayout from "../private/layout";

class SpacerModel implements Export.ISpacerModel {

    /*---- I.1 IModel ---------------------------------------------------------------------------*/

    /** @prototype only */
    divCount: number;

    /** @prototype only */
    divisions: number;

    /** defined externally */
    staffIdx: number;

    /** @prototype */
    frozenness: FrozenLevel;

    private _target: IModel;

    /*---- Implementation -----------------------------------------------------------------------*/

    constructor(target: IModel) {
        this._target = target;
    }

    checkSemantics(cursor: ICursor): IAny[] {
        return [];
    }

    __validate(cursor$: ICursor): void {
        // Nothing to do
    }

    __layout(cursor$: ICursor): Export.ISpacerLayout {
        return new SpacerModel.Layout(this, cursor$);
    }

    toXML(): string {
        return `<!-- spacer: ${this.divCount} divs -->\n`;
    }

    inspect() {
        return this.toXML();
    }
}

module SpacerModel {
    export class Layout implements Export.ISpacerLayout {
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

        boundingBoxes$: IBoundingRect[];
        renderClass: Type;
        expandPolicy: ExpandPolicy;
    }

    Layout.prototype.expandPolicy = ExpandPolicy.None;
    Layout.prototype.renderClass = Type.Spacer;
    Layout.prototype.boundingBoxes$ = [];
    Object.freeze(Layout.prototype.boundingBoxes$);
}

SpacerModel.prototype.divCount = 0;
SpacerModel.prototype.divisions = 0;
SpacerModel.prototype.frozenness = FrozenLevel.Warm;

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
    }
}

export default Export;
