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

import * as invariant from "invariant";

import {IModel} from "./document_model";
import Type from "./document_types";

import {ICursor} from "./private_cursor";
import {ILayout} from "./document_model";

class ProxyModel implements Export.IProxyModel {
    private _target: IModel;
    private _omTarget: IModel;
    _class = "Proxy";

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

    /*---- Validation Implementations -----------------------------------------------------------*/

    constructor(target: IModel) {
        this._target = target;
    }

    toXML(): string {
        return `<!-- proxy for ${(<any>this._target).toXML().replace(/--/g, "\\-\\-")} -->\n` +
            `<forward><duration>${this.divCount}</duration></forward>\n`;
    }

    inspect() {
        return this.toXML();
    }

    validate(cursor$: ICursor): void {
        invariant(!!this._target, "A proxy must have a target.");
        this._omTarget.validate(cursor$);
    }

    getLayout(cursor$: ICursor): Export.IProxyLayout {
        return this._omTarget.getLayout(cursor$);
    }
}

/**
 * Registers Proxy in the factory structure passed in.
 */
function Export(constructors: { [key: number]: any }) {
    constructors[Type.Proxy] = ProxyModel;
}

module Export {
    export interface IProxyModel extends IModel {
    }

    export interface IProxyLayout extends ILayout {
        model: IProxyModel;
    }
}

export default Export;
