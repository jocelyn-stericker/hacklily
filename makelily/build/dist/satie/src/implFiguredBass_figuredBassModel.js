"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
var musicxml_interfaces_1 = require("musicxml-interfaces");
var lodash_1 = require("lodash");
var document_1 = require("./document");
var FiguredBassModel = /** @class */ (function () {
    /*---- Implementation -----------------------------------------------------------------------*/
    function FiguredBassModel(spec) {
        var _this = this;
        this._color = 0x000000;
        lodash_1.forEach(spec, function (value, key) {
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
    FiguredBassModel.prototype.refresh = function (cursor) {
        // todo
    };
    FiguredBassModel.prototype.getLayout = function (cursor) {
        // todo
        return new FiguredBassModel.Layout(this, cursor);
    };
    FiguredBassModel.prototype.toXML = function () {
        return musicxml_interfaces_1.serializeFiguredBass(this) + "\n<forward><duration>" + this.divCount + "</duration></forward>\n";
    };
    FiguredBassModel.prototype.inspect = function () {
        return this.toXML();
    };
    FiguredBassModel.prototype.calcWidth = function (shortest) {
        return 0;
    };
    return FiguredBassModel;
}());
FiguredBassModel.prototype.divCount = 0;
FiguredBassModel.prototype.divisions = 0;
(function (FiguredBassModel) {
    var Layout = /** @class */ (function () {
        function Layout(model, cursor) {
            this.model = model;
            this.x = cursor.segmentX;
            this.division = cursor.segmentDivision;
        }
        return Layout;
    }());
    FiguredBassModel.Layout = Layout;
    Layout.prototype.expandPolicy = "none";
    Layout.prototype.renderClass = document_1.Type.FiguredBass;
    Layout.prototype.boundingBoxes = [];
    Object.freeze(Layout.prototype.boundingBoxes);
})(FiguredBassModel || (FiguredBassModel = {}));
/**
 * Registers FiguredBass in the factory structure passed in.
 */
function Export(constructors) {
    constructors[document_1.Type.FiguredBass] = FiguredBassModel;
}
exports.default = Export;
//# sourceMappingURL=implFiguredBass_figuredBassModel.js.map