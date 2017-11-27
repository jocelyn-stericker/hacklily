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
var private_renderUtil_1 = require("./private_renderUtil");
var private_fontManager_1 = require("./private_fontManager");
var private_smufl_1 = require("./private_smufl");
var DirectionModel = /** @class */ (function () {
    /*---- Implementation -----------------------------------------------------------------------*/
    function DirectionModel(spec) {
        var _this = this;
        this._class = "Direction";
        lodash_1.forEach(spec, function (value, key) {
            _this[key] = value;
        });
    }
    DirectionModel.prototype.refresh = function (cursor) {
        var _this = this;
        lodash_1.forEach(this.directionTypes, function (type) {
            if (type.dynamics && _this.placement === musicxml_interfaces_1.AboveBelow.Unspecified) {
                cursor.patch(function (staff) { return staff.direction(function (direction) {
                    return direction.placement(musicxml_interfaces_1.AboveBelow.Below);
                }); });
            }
        });
    };
    DirectionModel.prototype.getLayout = function (cursor) {
        return new DirectionModel.Layout(this, cursor);
    };
    DirectionModel.prototype.toXML = function () {
        return musicxml_interfaces_1.serializeDirection(this) + "\n<forward><duration>" + this.divCount + "</duration></forward>\n";
    };
    DirectionModel.prototype.toJSON = function () {
        var _a = this, _class = _a._class, directionTypes = _a.directionTypes, staff = _a.staff, offset = _a.offset, sound = _a.sound, placement = _a.placement, voice = _a.voice, footnote = _a.footnote, level = _a.level, data = _a.data;
        return {
            _class: _class,
            directionTypes: directionTypes,
            staff: staff,
            offset: offset,
            sound: sound,
            placement: placement,
            voice: voice,
            footnote: footnote,
            level: level,
            data: data,
        };
    };
    DirectionModel.prototype.inspect = function () {
        return this.toXML();
    };
    DirectionModel.prototype.calcWidth = function (shortest) {
        return 0;
    };
    return DirectionModel;
}());
DirectionModel.prototype.divCount = 0;
DirectionModel.prototype.divisions = 0;
(function (DirectionModel) {
    var Layout = /** @class */ (function () {
        function Layout(model, cursor) {
            var _this = this;
            model = Object.create(model);
            if (model.directionTypes) {
                model.directionTypes = model.directionTypes.slice();
            }
            this.model = model;
            this.x = cursor.segmentX;
            this.division = cursor.segmentDivision;
            var defaultY = 0;
            switch (model.placement) {
                case musicxml_interfaces_1.AboveBelow.Below:
                    defaultY = -60;
                    break;
                case musicxml_interfaces_1.AboveBelow.Above:
                case musicxml_interfaces_1.AboveBelow.Unspecified:
                    defaultY = 60;
                    break;
                default:
                    defaultY = 60;
                    break;
            }
            this.boundingBoxes = [];
            lodash_1.forEach(model.directionTypes, function (type, idx) {
                type = model.directionTypes[idx] = Object.create(model.directionTypes[idx]);
                lodash_1.forEach(type.words, function (word, idx) {
                    var origModel = type.words[idx];
                    var defaults = cursor.header.defaults;
                    type.words[idx] = Object.create(origModel);
                    type.words[idx].fontSize = type.words[idx].fontSize || "18";
                    type.words[idx].defaultX = 0;
                    type.words[idx].defaultY = defaultY;
                    var fontBox = private_fontManager_1.getTextBB(type.words[idx].fontFamily || "Alegreya", type.words[idx].data, parseInt(type.words[idx].fontSize, 10), type.words[idx].fontWeight === musicxml_interfaces_1.NormalBold.Normal ? null : "bold");
                    var scale40 = defaults.scaling.millimeters / defaults.scaling.tenths * 40;
                    var boundingBox = type.words[idx];
                    // Vertical coordinates are flipped (argh!)
                    // We give 10% padding because elements touching isn't ideal.
                    boundingBox.top = -private_renderUtil_1.mmToTenths(scale40, fontBox.bottom / private_renderUtil_1.ptPerMM) * 1.1;
                    boundingBox.bottom = -private_renderUtil_1.mmToTenths(scale40, fontBox.top / private_renderUtil_1.ptPerMM) * 1.1;
                    boundingBox.left = private_renderUtil_1.mmToTenths(scale40, fontBox.left / private_renderUtil_1.ptPerMM) * 1.1;
                    boundingBox.right = private_renderUtil_1.mmToTenths(scale40, fontBox.right / private_renderUtil_1.ptPerMM) * 1.1;
                    _this.boundingBoxes.push(boundingBox);
                });
                if (type.dynamics) {
                    var origDynamics = type.dynamics;
                    type.dynamics = Object.create(origDynamics);
                    type.dynamics.defaultX = 0;
                    type.dynamics.defaultY = defaultY;
                    var boundingBox = type.dynamics;
                    boundingBox.left = -10;
                    boundingBox.right = 30;
                    boundingBox.top = -10;
                    boundingBox.bottom = 30; // TODO
                    _this.boundingBoxes.push(boundingBox);
                }
                lodash_1.forEach(type.segnos, function (origSegno, idx) {
                    var segno = Object.create(origSegno);
                    type.segnos[idx] = segno;
                    segno.defaultX = segno.defaultX || -30;
                    segno.defaultY = (segno.defaultY || defaultY);
                    segno.color = segno.color || "black";
                    var boundingBox = segno;
                    boundingBox.right = private_smufl_1.bboxes["segno"][0] * 10 + 10;
                    boundingBox.top = -private_smufl_1.bboxes["segno"][1] * 10 - 10;
                    boundingBox.left = private_smufl_1.bboxes["segno"][2] * 10 - 10;
                    boundingBox.bottom = -private_smufl_1.bboxes["segno"][3] * 10 + 10;
                    _this.boundingBoxes.push(boundingBox);
                });
            });
            this.renderedWidth = 0;
        }
        return Layout;
    }());
    DirectionModel.Layout = Layout;
    Layout.prototype.expandPolicy = "none";
    Layout.prototype.renderClass = document_1.Type.Direction;
    Layout.prototype.boundingBoxes = [];
    Object.freeze(Layout.prototype.boundingBoxes);
})(DirectionModel || (DirectionModel = {}));
function Export(constructors) {
    constructors[document_1.Type.Direction] = DirectionModel;
}
exports.default = Export;
//# sourceMappingURL=implDirection_directionModel.js.map