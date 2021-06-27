/**
 * This file is part of Satie music engraver <https://github.com/emilyskidsister/satie>.
 * Copyright (C) Jocelyn Stericker <jocelyn@nettek.ca> 2015 - present.
 *
 * Satie is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * Satie is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Satie.  If not, see <http://www.gnu.org/licenses/>.
 */
import { serializeHarmony, } from "musicxml-interfaces";
import { forEach } from "lodash";
import { Type } from "./document";
var HarmonyModel = /** @class */ (function () {
    /*---- Implementation -----------------------------------------------------------------------*/
    function HarmonyModel(spec) {
        var _this = this;
        /*---- I.1 IModel ---------------------------------------------------------------------------*/
        this.divCount = 0;
        this.divisions = 0;
        /*---- Private ------------------------------------------------------------------------------*/
        this._color = 0x000000;
        forEach(spec, function (value, key) {
            _this[key] = value;
        });
    }
    Object.defineProperty(HarmonyModel.prototype, "color", {
        /*---- PrintStyle > Color ---------------------------------------------------------------*/
        get: function () {
            var hex = this._color.toString(16);
            return "#" + "000000".substr(0, 6 - hex.length) + hex;
        },
        set: function (a) {
            switch (true) {
                case !a:
                    this._color = 0;
                    break;
                case a[0] === "#":
                    a = a.slice(1);
                    this._color = parseInt(a, 16);
                    break;
                default:
                    this._color = parseInt(a, 16);
                    break;
            }
        },
        enumerable: true,
        configurable: true
    });
    HarmonyModel.prototype.refresh = function (_cursor) {
        // todo
    };
    HarmonyModel.prototype.getLayout = function (cursor) {
        // todo
        return new HarmonyModel.Layout(this, cursor);
    };
    HarmonyModel.prototype.toXML = function () {
        return serializeHarmony(this) + "\n<forward><duration>" + this.divCount + "</duration></forward>\n";
    };
    HarmonyModel.prototype.inspect = function () {
        return this.toXML();
    };
    HarmonyModel.prototype.calcWidth = function (_shortest) {
        return 0;
    };
    HarmonyModel.Layout = /** @class */ (function () {
        function Layout(model, cursor) {
            // Prototype:
            this.boundingBoxes = [];
            this.renderClass = Type.Harmony;
            this.expandPolicy = "none";
            this.model = model;
            this.x = cursor.segmentX;
            this.division = cursor.segmentDivision;
        }
        return Layout;
    }());
    return HarmonyModel;
}());
/**
 * Registers Harmony in the factory structure passed in.
 */
export default function Export(constructors) {
    constructors[Type.Harmony] = HarmonyModel;
}
//# sourceMappingURL=implHarmony_harmonyModel.js.map