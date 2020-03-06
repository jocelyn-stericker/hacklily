/**
 * This file is part of Satie music engraver <https://github.com/jnetterf/satie>.
 * Copyright (C) Joshua Netterfield <joshua.ca> 2015 - present.
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
import { serializeFiguredBass, } from "musicxml-interfaces";
import { forEach } from "lodash";
import { Type } from "./document";
var FiguredBassModel = /** @class */ (function () {
    /*---- Implementation -----------------------------------------------------------------------*/
    function FiguredBassModel(spec) {
        var _this = this;
        /*---- I.1 IModel ---------------------------------------------------------------------------*/
        this.divCount = 0;
        this.divisions = 0;
        this._color = 0x000000;
        forEach(spec, function (value, key) {
            _this[key] = value;
        });
    }
    Object.defineProperty(FiguredBassModel.prototype, "color", {
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
    FiguredBassModel.prototype.refresh = function (_cursor) {
        // todo
    };
    FiguredBassModel.prototype.getLayout = function (cursor) {
        // todo
        return new FiguredBassModel.Layout(this, cursor);
    };
    FiguredBassModel.prototype.toXML = function () {
        return serializeFiguredBass(this) + "\n<forward><duration>" + this.divCount + "</duration></forward>\n";
    };
    FiguredBassModel.prototype.inspect = function () {
        return this.toXML();
    };
    FiguredBassModel.prototype.calcWidth = function (_shortest) {
        return 0;
    };
    FiguredBassModel.Layout = /** @class */ (function () {
        function Layout(model, cursor) {
            // Prototype:
            this.boundingBoxes = [];
            this.renderClass = Type.FiguredBass;
            this.expandPolicy = "none";
            this.model = model;
            this.x = cursor.segmentX;
            this.division = cursor.segmentDivision;
        }
        return Layout;
    }());
    return FiguredBassModel;
}());
/**
 * Registers FiguredBass in the factory structure passed in.
 */
export default function Export(constructors) {
    constructors[Type.FiguredBass] = FiguredBassModel;
}
//# sourceMappingURL=implFiguredBass_figuredBassModel.js.map