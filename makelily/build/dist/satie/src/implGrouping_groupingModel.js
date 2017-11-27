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
var GroupingModel = /** @class */ (function () {
    /*---- Implementation -----------------------------------------------------------------------*/
    function GroupingModel(spec) {
        var _this = this;
        lodash_1.forEach(spec, function (value, key) {
            _this[key] = value;
        });
    }
    GroupingModel.prototype.refresh = function (cursor) {
        // todo
    };
    GroupingModel.prototype.getLayout = function (cursor) {
        // todo
        return new GroupingModel.Layout(this, cursor);
    };
    GroupingModel.prototype.toXML = function () {
        return musicxml_interfaces_1.serializeGrouping(this) + "\n<forward><duration>" + this.divCount + "</duration></forward>\n";
    };
    GroupingModel.prototype.inspect = function () {
        return this.toXML();
    };
    GroupingModel.prototype.calcWidth = function (shortest) {
        return 0;
    };
    return GroupingModel;
}());
GroupingModel.prototype.divCount = 0;
GroupingModel.prototype.divisions = 0;
(function (GroupingModel) {
    var Layout = /** @class */ (function () {
        function Layout(model, cursor) {
            this.model = model;
            this.x = cursor.segmentX;
            this.division = cursor.segmentDivision;
        }
        return Layout;
    }());
    GroupingModel.Layout = Layout;
    Layout.prototype.expandPolicy = "none";
    Layout.prototype.renderClass = document_1.Type.Grouping;
    Layout.prototype.boundingBoxes = [];
    Object.freeze(Layout.prototype.boundingBoxes);
})(GroupingModel || (GroupingModel = {}));
/**
 * Registers Grouping in the factory structure passed in.
 */
function Export(constructors) {
    constructors[document_1.Type.Grouping] = GroupingModel;
}
exports.default = Export;
//# sourceMappingURL=implGrouping_groupingModel.js.map