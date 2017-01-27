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

import {IModel, Type, ILayout} from "./document";
import {IReadOnlyValidationCursor, LayoutCursor} from "./private_cursor";

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

    refresh(cursor: IReadOnlyValidationCursor): void {
        invariant(!!this._target, "A proxy must have a target.");
        this._omTarget.refresh(cursor);
    }

    getLayout(cursor: LayoutCursor): Export.IProxyLayout {
        return this._omTarget.getLayout(cursor);
    }

    calcWidth(shortest: number) {
        return this._target ? this._target.calcWidth(shortest) : 0;
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
