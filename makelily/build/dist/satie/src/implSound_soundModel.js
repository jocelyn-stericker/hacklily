/**
 * @source: https://github.com/emilyskidsister/satie/
 *
 * @license
 * (C) Jocelyn Stericker <jocelyn@nettek.ca> 2015.
 * Part of the Satie music engraver <https://github.com/emilyskidsister/satie>.
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
import { serializeSound, } from "musicxml-interfaces";
import { forEach } from "lodash";
import { Type } from "./document";
var SoundModel = /** @class */ (function () {
    /*---- Implementation -----------------------------------------------------------------------*/
    function SoundModel(spec) {
        var _this = this;
        /*---- I.1 IModel ---------------------------------------------------------------------------*/
        this.divCount = 0;
        forEach(spec, function (value, key) {
            _this[key] = value;
        });
    }
    SoundModel.prototype.refresh = function (_cursor) {
        // todo
    };
    SoundModel.prototype.getLayout = function (cursor) {
        // mutates cursor as required.
        return new SoundModel.Layout(this, cursor);
    };
    SoundModel.prototype.toXML = function () {
        return serializeSound(this) + "\n<forward><duration>" + this.divCount + "</duration></forward>\n";
    };
    SoundModel.prototype.inspect = function () {
        return this.toXML();
    };
    SoundModel.prototype.calcWidth = function (_shortest) {
        return 0;
    };
    SoundModel.Layout = /** @class */ (function () {
        function Layout(model, cursor) {
            // Prototype:
            this.boundingBoxes = [];
            this.renderClass = Type.Sound;
            this.expandPolicy = "none";
            this.model = model;
            this.x = cursor.segmentX;
            this.division = cursor.segmentDivision;
        }
        return Layout;
    }());
    return SoundModel;
}());
/**
 * Registers Sound in the factory structure passed in.
 */
export default function Export(constructors) {
    constructors[Type.Sound] = SoundModel;
}
//# sourceMappingURL=implSound_soundModel.js.map