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
import { serializeGrouping, } from "musicxml-interfaces";
import { forEach } from "lodash";
import { Type } from "./document";
var GroupingModel = /** @class */ (function () {
    /*---- Implementation -----------------------------------------------------------------------*/
    function GroupingModel(spec) {
        var _this = this;
        /*---- I.1 IModel ---------------------------------------------------------------------------*/
        this.divCount = 0;
        this.divisions = 0;
        forEach(spec, function (value, key) {
            _this[key] = value;
        });
    }
    GroupingModel.prototype.refresh = function (_cursor) {
        // todo
    };
    GroupingModel.prototype.getLayout = function (cursor) {
        // todo
        return new GroupingModel.Layout(this, cursor);
    };
    GroupingModel.prototype.toXML = function () {
        return serializeGrouping(this) + "\n<forward><duration>" + this.divCount + "</duration></forward>\n";
    };
    GroupingModel.prototype.inspect = function () {
        return this.toXML();
    };
    GroupingModel.prototype.calcWidth = function (_shortest) {
        return 0;
    };
    GroupingModel.Layout = /** @class */ (function () {
        function Layout(model, cursor) {
            // Prototype:
            this.boundingBoxes = [];
            this.renderClass = Type.Grouping;
            this.expandPolicy = "none";
            this.model = model;
            this.x = cursor.segmentX;
            this.division = cursor.segmentDivision;
        }
        return Layout;
    }());
    return GroupingModel;
}());
/**
 * Registers Grouping in the factory structure passed in.
 */
export default function Export(constructors) {
    constructors[Type.Grouping] = GroupingModel;
}
//# sourceMappingURL=implGrouping_groupingModel.js.map