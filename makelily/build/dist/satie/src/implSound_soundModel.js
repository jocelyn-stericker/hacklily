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
var musicxml_interfaces_1 = require("musicxml-interfaces");
var lodash_1 = require("lodash");
var document_1 = require("./document");
var SoundModel = /** @class */ (function () {
    /*---- Implementation -----------------------------------------------------------------------*/
    function SoundModel(spec) {
        var _this = this;
        lodash_1.forEach(spec, function (value, key) {
            _this[key] = value;
        });
    }
    SoundModel.prototype.refresh = function (cursor) {
        // todo
    };
    SoundModel.prototype.getLayout = function (cursor) {
        // mutates cursor as required.
        return new SoundModel.Layout(this, cursor);
    };
    SoundModel.prototype.toXML = function () {
        return musicxml_interfaces_1.serializeSound(this) + "\n<forward><duration>" + this.divCount + "</duration></forward>\n";
    };
    SoundModel.prototype.inspect = function () {
        return this.toXML();
    };
    SoundModel.prototype.calcWidth = function (shortest) {
        return 0;
    };
    return SoundModel;
}());
SoundModel.prototype.divCount = 0;
(function (SoundModel) {
    var Layout = /** @class */ (function () {
        function Layout(model, cursor) {
            this.model = model;
            this.x = cursor.segmentX;
            this.division = cursor.segmentDivision;
        }
        return Layout;
    }());
    SoundModel.Layout = Layout;
    Layout.prototype.expandPolicy = "none";
    Layout.prototype.renderClass = document_1.Type.Sound;
    Layout.prototype.boundingBoxes = [];
    Object.freeze(Layout.prototype.boundingBoxes);
})(SoundModel || (SoundModel = {}));
/**
 * Registers Sound in the factory structure passed in.
 */
function Export(constructors) {
    constructors[document_1.Type.Sound] = SoundModel;
}
exports.default = Export;
//# sourceMappingURL=implSound_soundModel.js.map