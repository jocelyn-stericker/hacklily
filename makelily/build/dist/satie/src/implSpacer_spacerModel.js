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
import { Type } from "./document";
var SpacerModel = /** @class */ (function () {
    /*---- Implementation -----------------------------------------------------------------------*/
    function SpacerModel(target) {
        this._class = "Spacer";
        this.divisions = 0;
        this.staffIdx = 0;
        if (target) {
            this.divCount = target.divCount;
        }
    }
    SpacerModel.prototype.toJSON = function () {
        var _a = this, _class = _a._class, divCount = _a.divCount;
        return {
            _class: _class,
            divCount: divCount,
        };
    };
    SpacerModel.prototype.refresh = function (_cursor) {
        // Nothing to do
    };
    SpacerModel.prototype.getLayout = function (cursor) {
        return new SpacerModel.Layout(this, cursor);
    };
    SpacerModel.prototype.toXML = function () {
        return "<!-- spacer -->\n<forward><duration>" + this.divCount + "</duration></forward>\n";
    };
    SpacerModel.prototype.inspect = function () {
        return this.toXML();
    };
    SpacerModel.prototype.calcWidth = function (_shortest) {
        return 0;
    };
    SpacerModel.Layout = /** @class */ (function () {
        function Layout(model, cursor) {
            // Prototype:
            this.boundingBoxes = [];
            this.renderClass = Type.Spacer;
            this.expandPolicy = "none";
            this.model = model;
            this.x = cursor.segmentX;
            this.division = cursor.segmentDivision;
            this.renderedWidth = 0;
        }
        return Layout;
    }());
    return SpacerModel;
}());
/**
 * Registers Spacer in the factory structure passed in.
 */
export default function Export(constructors) {
    constructors[Type.Spacer] = SpacerModel;
}
//# sourceMappingURL=implSpacer_spacerModel.js.map