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
import { AboveBelow, NormalBold, serializeDirection, } from "musicxml-interfaces";
import { forEach } from "lodash";
import { Type } from "./document";
import { mmToTenths, ptPerMM } from "./private_renderUtil";
import { getTextBB } from "./private_fontManager";
import { bboxes as glyphBoxes } from "./private_smufl";
var DirectionModel = /** @class */ (function () {
    /*---- Implementation -----------------------------------------------------------------------*/
    function DirectionModel(spec) {
        var _this = this;
        this._class = "Direction";
        /*---- I.1 IModel ---------------------------------------------------------------------------*/
        this.divCount = 0;
        this.divisions = 0;
        forEach(spec, function (value, key) {
            _this[key] = value;
        });
    }
    DirectionModel.prototype.refresh = function (cursor) {
        var _this = this;
        forEach(this.directionTypes, function (type) {
            if (type.dynamics && _this.placement === AboveBelow.Unspecified) {
                cursor.patch(function (staff) {
                    return staff.direction(function (direction) { return direction.placement(AboveBelow.Below); });
                });
            }
        });
    };
    DirectionModel.prototype.getLayout = function (cursor) {
        return new DirectionModel.Layout(this, cursor);
    };
    DirectionModel.prototype.toXML = function () {
        return serializeDirection(this) + "\n<forward><duration>" + this.divCount + "</duration></forward>\n";
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
    DirectionModel.prototype.calcWidth = function (_shortest) {
        return 0;
    };
    DirectionModel.Layout = /** @class */ (function () {
        function Layout(model, cursor) {
            var _this = this;
            // Prototype:
            this.boundingBoxes = [];
            this.renderClass = Type.Direction;
            this.expandPolicy = "none";
            model = Object.create(model);
            if (model.directionTypes) {
                model.directionTypes = model.directionTypes.slice();
            }
            this.model = model;
            this.x = cursor.segmentX;
            this.division = cursor.segmentDivision;
            var defaultY = 0;
            switch (model.placement) {
                case AboveBelow.Below:
                    defaultY = -60;
                    break;
                case AboveBelow.Above:
                case AboveBelow.Unspecified:
                    defaultY = 60;
                    break;
                default:
                    defaultY = 60;
                    break;
            }
            this.boundingBoxes = [];
            forEach(model.directionTypes, function (type, idx) {
                type = model.directionTypes[idx] = Object.create(model.directionTypes[idx]);
                forEach(type.words, function (_word, idx) {
                    var origModel = type.words[idx];
                    var defaults = cursor.header.defaults;
                    type.words[idx] = Object.create(origModel);
                    type.words[idx].fontSize = type.words[idx].fontSize || "18";
                    type.words[idx].defaultX = 0;
                    type.words[idx].defaultY = defaultY;
                    var fontBox = getTextBB(type.words[idx].fontFamily || "Alegreya", type.words[idx].data, parseInt(type.words[idx].fontSize, 10), type.words[idx].fontWeight === NormalBold.Normal ? null : "bold");
                    var scale40 = (defaults.scaling.millimeters / defaults.scaling.tenths) * 40;
                    var boundingBox = type.words[idx];
                    // Vertical coordinates are flipped (argh!)
                    // We give 10% padding because elements touching isn't ideal.
                    boundingBox.top =
                        -mmToTenths(scale40, fontBox.bottom / ptPerMM) * 1.1;
                    boundingBox.bottom =
                        -mmToTenths(scale40, fontBox.top / ptPerMM) * 1.1;
                    boundingBox.left = mmToTenths(scale40, fontBox.left / ptPerMM) * 1.1;
                    boundingBox.right =
                        mmToTenths(scale40, fontBox.right / ptPerMM) * 1.1;
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
                forEach(type.segnos, function (origSegno, idx) {
                    var segno = Object.create(origSegno);
                    type.segnos[idx] = segno;
                    segno.defaultX = segno.defaultX || -30;
                    segno.defaultY = segno.defaultY || defaultY;
                    segno.color = segno.color || "black";
                    var boundingBox = segno;
                    boundingBox.right = glyphBoxes["segno"][0] * 10 + 10;
                    boundingBox.top = -glyphBoxes["segno"][1] * 10 - 10;
                    boundingBox.left = glyphBoxes["segno"][2] * 10 - 10;
                    boundingBox.bottom = -glyphBoxes["segno"][3] * 10 + 10;
                    _this.boundingBoxes.push(boundingBox);
                });
            });
            this.renderedWidth = 0;
        }
        return Layout;
    }());
    return DirectionModel;
}());
export default function Export(constructors) {
    constructors[Type.Direction] = DirectionModel;
}
//# sourceMappingURL=implDirection_directionModel.js.map