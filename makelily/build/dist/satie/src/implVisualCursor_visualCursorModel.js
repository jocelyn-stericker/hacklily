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
var document_1 = require("./document");
var VisualCursorModel = /** @class */ (function () {
    /*---- Implementation -----------------------------------------------------------------------*/
    function VisualCursorModel(spec) {
        this._class = "VisualCursor";
        this.staffIdx = 1;
        this._myIdx = ++VisualCursorModel._lastIdx;
        // no-op
    }
    VisualCursorModel.prototype.refresh = function (cursor) {
        // no-op
    };
    VisualCursorModel.prototype.getLayout = function (cursor) {
        return new VisualCursorModel.Layout(this, cursor);
    };
    VisualCursorModel.prototype.toXML = function () {
        return "<!-- visual cursor -->\n";
    };
    VisualCursorModel.prototype.toJSON = function () {
        var _class = this._class;
        return {
            _class: _class,
        };
    };
    VisualCursorModel.prototype.inspect = function () {
        return this.toXML();
    };
    VisualCursorModel.prototype.calcWidth = function (shortest) {
        return 0;
    };
    VisualCursorModel._lastIdx = 1;
    return VisualCursorModel;
}());
VisualCursorModel.prototype.divCount = 0;
VisualCursorModel.prototype.divisions = 0;
(function (VisualCursorModel) {
    var Layout = /** @class */ (function () {
        function Layout(origModel, cursor) {
            this.model = origModel;
            this.x = cursor.segmentX;
            this.division = cursor.segmentDivision;
            this.renderedWidth = 0;
        }
        return Layout;
    }());
    VisualCursorModel.Layout = Layout;
    Layout.prototype.expandPolicy = "none";
    Layout.prototype.renderClass = document_1.Type.VisualCursor;
    Layout.prototype.boundingBoxes = [];
    Object.freeze(Layout.prototype.boundingBoxes);
})(VisualCursorModel || (VisualCursorModel = {}));
/**
 * Registers VisualCursor in the factory structure passed in.
 */
function Export(constructors) {
    constructors[document_1.Type.VisualCursor] = VisualCursorModel;
}
exports.default = Export;
//# sourceMappingURL=implVisualCursor_visualCursorModel.js.map