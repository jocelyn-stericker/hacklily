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
var document_1 = require("./document");
var SpacerModel = /** @class */ (function () {
    /*---- Implementation -----------------------------------------------------------------------*/
    function SpacerModel(target) {
        this._class = "Spacer";
        if (target) {
            this._target = target;
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
    SpacerModel.prototype.refresh = function (cursor) {
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
    SpacerModel.prototype.calcWidth = function (shortest) {
        return 0;
    };
    return SpacerModel;
}());
(function (SpacerModel) {
    var Layout = /** @class */ (function () {
        function Layout(model, cursor) {
            this.model = model;
            this.x = cursor.segmentX;
            this.division = cursor.segmentDivision;
            this.renderedWidth = 0;
        }
        return Layout;
    }());
    SpacerModel.Layout = Layout;
    Layout.prototype.expandPolicy = "none";
    Layout.prototype.renderClass = document_1.Type.Spacer;
    Layout.prototype.boundingBoxes = [];
    Object.freeze(Layout.prototype.boundingBoxes);
})(SpacerModel || (SpacerModel = {}));
SpacerModel.prototype.divCount = 0;
SpacerModel.prototype.divisions = 0;
/**
 * Registers Spacer in the factory structure passed in.
 */
function Export(constructors) {
    constructors[document_1.Type.Spacer] = SpacerModel;
}
exports.default = Export;
//# sourceMappingURL=implSpacer_spacerModel.js.map