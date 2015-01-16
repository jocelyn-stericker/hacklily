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

"use strict";

import TypedReact   = require("typed-react");

import C            = require("../stores/contracts");

// spec should be a model, but this is not enforced because of TypeScript export restrictions.
class PureModelViewMixin extends TypedReact.Mixin<{spec: any}, {}> {
    _hash: number;
    shouldComponentUpdate(nextProps: {spec: any}, nextState: {}) {
        var oldHash = this._hash;
        this._hash = C.JSONx.hash(nextProps) + nextProps.spec.x*9973 + nextProps.spec.y*997;
        return oldHash !== this._hash;
    }
}

var Mixin = TypedReact.createMixin(PureModelViewMixin);

export = Mixin;
