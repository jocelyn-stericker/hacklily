"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
var invariant = require("invariant");
var document_1 = require("./document");
var ProxyModel = /** @class */ (function () {
    /*---- Validation Implementations -----------------------------------------------------------*/
    function ProxyModel(target) {
        this._class = "Proxy";
        this._target = target;
    }
    Object.defineProperty(ProxyModel.prototype, "divCount", {
        /*---- I.1 IModel ---------------------------------------------------------------------------*/
        get: function () {
            return this._omTarget.divCount;
        },
        set: function (divCount) {
            this._omTarget.divCount = divCount;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ProxyModel.prototype, "staffIdx", {
        get: function () {
            return this._omTarget.staffIdx;
        },
        set: function (staffIdx) {
            this._omTarget.staffIdx = staffIdx;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ProxyModel.prototype, "target", {
        set: function (target) {
            this._target = target;
            this._omTarget = Object.create(this._target);
            this._omTarget.staffIdx = undefined;
        },
        enumerable: true,
        configurable: true
    });
    ProxyModel.prototype.toXML = function () {
        return "<!-- proxy for " + this._target.toXML().replace(/--/g, "\\-\\-") + " -->\n" +
            ("<forward><duration>" + this.divCount + "</duration></forward>\n");
    };
    ProxyModel.prototype.inspect = function () {
        return this.toXML();
    };
    ProxyModel.prototype.refresh = function (cursor) {
        invariant(!!this._target, "A proxy must have a target.");
        this._omTarget.refresh(cursor);
    };
    ProxyModel.prototype.getLayout = function (cursor) {
        return this._omTarget.getLayout(cursor);
    };
    ProxyModel.prototype.calcWidth = function (shortest) {
        return this._target ? this._target.calcWidth(shortest) : 0;
    };
    return ProxyModel;
}());
/**
 * Registers Proxy in the factory structure passed in.
 */
function Export(constructors) {
    constructors[document_1.Type.Proxy] = ProxyModel;
}
exports.default = Export;
//# sourceMappingURL=implProxy_proxyModel.js.map