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
import { Type } from "./document";
var VisualCursorModel = /** @class */ (function () {
    /*---- Implementation -----------------------------------------------------------------------*/
    function VisualCursorModel(_spec) {
        this._class = "VisualCursor";
        /*---- I.1 IModel ---------------------------------------------------------------------------*/
        this.divCount = 0;
        this.divisions = 0;
        this.staffIdx = 1;
        this._myIdx = ++VisualCursorModel._lastIdx;
        // no-op
    }
    VisualCursorModel.prototype.refresh = function (_cursor) {
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
    VisualCursorModel.prototype.calcWidth = function (_shortest) {
        return 0;
    };
    VisualCursorModel._lastIdx = 1;
    VisualCursorModel.Layout = /** @class */ (function () {
        function Layout(origModel, cursor) {
            // Prototype:
            this.boundingBoxes = [];
            this.renderClass = Type.VisualCursor;
            this.expandPolicy = "none";
            this.model = origModel;
            this.x = cursor.segmentX;
            this.division = cursor.segmentDivision;
            this.renderedWidth = 0;
        }
        return Layout;
    }());
    return VisualCursorModel;
}());
/**
 * Registers VisualCursor in the factory structure passed in.
 */
export default function Export(constructors) {
    constructors[Type.VisualCursor] = VisualCursorModel;
}
//# sourceMappingURL=implVisualCursor_visualCursorModel.js.map