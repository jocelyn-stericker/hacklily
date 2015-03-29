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

import Engine           = require("./engine");

class ProxyModel implements Export.IProxyModel {

    /*---- I.1 IModel ---------------------------------------------------------------------------*/

    /** @prototype only */
    divCount:        number;

    /** defined externally */
    staffIdx:        number;

    /** @prototype */
    frozenness:      Engine.IModel.FrozenLevel;

    modelDidLoad$(segment$: Engine.Measure.ISegment): void {
        // todo
    }

    validate$(cursor$: Engine.ICursor): void {
        this._target.validate$(cursor$);
    }

    layout(cursor$: Engine.ICursor): Export.ILayout {
        return this._target.layout(cursor$);
    }

    /*---- Validation Implementations -----------------------------------------------------------*/

    constructor(target: Engine.IModel) {
        this._target = target;
    }

    toXML(): string {
        return "<!-- proxy -->\n";
    }

    inspect() {
        return this.toXML();
    }

    _target: Engine.IModel;
}

ProxyModel.prototype.divCount = 0;
ProxyModel.prototype.frozenness = Engine.IModel.FrozenLevel.Warm;

/**
 * Registers Proxy in the factory structure passed in.
 */
function Export(constructors: { [key: number]: any }) {
    constructors[Engine.IModel.Type.Proxy] = ProxyModel;
}

module Export {
    export interface IProxyModel extends Engine.IModel {
    }

    export interface ILayout extends Engine.IModel.ILayout {
        model: IProxyModel;
    }
}

export = Export;
