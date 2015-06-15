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

import invariant = require("react/lib/invariant");

import {ICursor, IModel, ISegment} from "../engine";

class ProxyModel implements Export.IProxyModel {

    /*---- I.1 IModel ---------------------------------------------------------------------------*/

    get divCount() {
        return this._omTarget.divCount;
    }

    set divCount(divCount: number) {
        this._omTarget.divCount = divCount;
    }

    get staffIdx() {
        return this._omTarget.staffIdx;
    }

    set staffIdx(staffIdx: number) {
        this._omTarget.staffIdx = staffIdx;
    }

    set target(target: IModel) {
        this._target = target;
        this._omTarget = Object.create(this._target);
        this._omTarget.staffIdx = undefined;
    }

    /** @prototype */
    frozenness: IModel.FrozenLevel;

    modelDidLoad$(segment$: ISegment): void {
        // todo
    }

    validate$(cursor$: ICursor): void {
        invariant(!!this._target, "A proxy must have a target.");
        this._omTarget.validate$(cursor$);
    }

    layout(cursor$: ICursor): Export.ILayout {
        return this._omTarget.layout(cursor$);
    }

    /*---- Validation Implementations -----------------------------------------------------------*/

    constructor(target: IModel) {
        this._target = target;
    }

    toXML(): string {
        return `<!-- proxy for ${(<any>this._target).toXML().replace(/--/g, "\\-\\-")} -->\n`;
    }

    inspect() {
        return this.toXML();
    }

    _target: IModel;
    _omTarget: IModel;
}

ProxyModel.prototype.frozenness = IModel.FrozenLevel.Warm;

/**
 * Registers Proxy in the factory structure passed in.
 */
function Export(constructors: { [key: number]: any }) {
    constructors[IModel.Type.Proxy] = ProxyModel;
}

module Export {
    export interface IProxyModel extends IModel {
    }

    export interface ILayout extends IModel.ILayout {
        model: IProxyModel;
    }
}

export default Export;
