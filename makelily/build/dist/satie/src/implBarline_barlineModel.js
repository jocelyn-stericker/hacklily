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
var builders_1 = require("musicxml-interfaces/builders");
var lodash_1 = require("lodash");
var document_1 = require("./document");
var private_part_1 = require("./private_part");
var private_smufl_1 = require("./private_smufl");
var implAttributes_attributesModel_1 = require("./implAttributes_attributesModel");
var implAttributes_attributesData_1 = require("./implAttributes_attributesData");
var BarlineModel = /** @class */ (function () {
    /*---- Implementation -----------------------------------------------------------------------*/
    function BarlineModel(spec) {
        var _this = this;
        this._class = "Barline";
        lodash_1.forEach(spec, function (value, key) {
            _this[key] = value;
        });
    }
    BarlineModel.prototype.toJSON = function () {
        var _a = this, _class = _a._class, segno = _a.segno, coda = _a.coda, location = _a.location, codaAttrib = _a.codaAttrib, wavyLine = _a.wavyLine, fermatas = _a.fermatas, segnoAttrib = _a.segnoAttrib, divisions = _a.divisions, barStyle = _a.barStyle, ending = _a.ending, repeat = _a.repeat, footnote = _a.footnote;
        return { _class: _class, segno: segno, coda: coda, location: location, codaAttrib: codaAttrib,
            wavyLine: wavyLine, fermatas: fermatas, segnoAttrib: segnoAttrib, divisions: divisions,
            barStyle: barStyle, ending: ending, repeat: repeat, footnote: footnote };
    };
    BarlineModel.prototype.refresh = function (cursor) {
        if (!this.barStyle) {
            cursor.patch(function (staff) { return staff
                .barline(function (barline) { return barline
                .barStyle(builders_1.buildBarStyle(function (barStyle) { return barStyle
                .data(musicxml_interfaces_1.BarStyleType.Regular)
                .color("black"); })); }); });
        }
        if (!isFinite(this.barStyle.data) || this.barStyle.data === null) {
            var lastBarlineInSegment_1 = !lodash_1.some(cursor.segmentInstance.slice(cursor.segmentPosition + 1), function (model) { return cursor.factory.modelHasType(model, document_1.Type.Barline); });
            cursor.patch(function (staff) { return staff
                .barline(function (barline) { return barline
                .barStyle({
                data: lastBarlineInSegment_1 && cursor.measureIsLast ?
                    musicxml_interfaces_1.BarStyleType.LightHeavy : musicxml_interfaces_1.BarStyleType.Regular,
            }); }); });
        }
        if (!this.barStyle.color) {
            cursor.patch(function (staff) { return staff
                .barline(function (barline) { return barline
                .barStyle(function (barStyle) { return barStyle
                .color("black"); }); }); });
        }
    };
    BarlineModel.prototype.getLayout = function (cursor) {
        // mutates cursor as required.
        return new BarlineModel.Layout(this, cursor);
    };
    BarlineModel.prototype.toXML = function () {
        return musicxml_interfaces_1.serializeBarline(this) + "\n<forward><duration>" + this.divCount + "</duration></forward>\n";
    };
    BarlineModel.prototype.inspect = function () {
        return this.toXML();
    };
    BarlineModel.prototype.calcWidth = function (shortest) {
        return 8; // TODO
    };
    return BarlineModel;
}());
BarlineModel.prototype.divCount = 0;
(function (BarlineModel) {
    var Layout = /** @class */ (function () {
        function Layout(origModel, cursor) {
            var _this = this;
            this.division = cursor.segmentDivision;
            this.x = cursor.segmentX;
            var attributes = cursor.staffAttributes;
            var measureStyle = attributes.measureStyle, partSymbol = attributes.partSymbol;
            if (measureStyle.multipleRest && measureStyle.multipleRest.count > 1) {
                // TODO: removing this shows that measures are slightly misplaced
                return;
            }
            this.partGroups = private_part_1.groupsForPart(cursor.header.partList, cursor.segmentInstance.part);
            this.partSymbol = partSymbol;
            this.model = Object.create(origModel, {
                defaultX: {
                    get: function () { return _this.overrideX; }
                }
            });
            var clefOffset = 0;
            if (cursor.lineTotalBarsOnLine === cursor.lineBarOnLine + 1) {
                // TODO: Figure out a way to get this to work when the attributes on the next
                // line change
                var nextMeasure = cursor.document.measures[cursor.measureInstance.idx + 1];
                var part = nextMeasure && nextMeasure.parts[cursor.segmentInstance.part];
                var segment = part && part.staves[cursor.staffIdx];
                var nextAttributes = void 0;
                if (segment) {
                    var n = cursor.factory.search(segment, 0, document_1.Type.Attributes)[0];
                    if (n) {
                        nextAttributes = n._snapshot;
                    }
                }
                var addWarning = nextAttributes && implAttributes_attributesData_1.needsWarning(attributes, nextAttributes, cursor.staffIdx);
                if (addWarning) {
                    var clefsAreEqual = implAttributes_attributesData_1.clefsEqual(attributes, nextAttributes, cursor.staffIdx);
                    clefOffset = clefsAreEqual ? 0 : implAttributes_attributesData_1.CLEF_INDENTATION;
                    this.model.satieAttributes = implAttributes_attributesModel_1.default.createWarningLayout(cursor, attributes, nextAttributes);
                }
            }
            this.model.defaultY = 0;
            this.yOffset = 0; // TODO
            this.height = 20; // TODO
            /*---- Geometry ---------------------------------------*/
            var lineWidths = cursor.header.defaults.appearance.lineWidths;
            var barlineSep = private_smufl_1.bravura.engravingDefaults.barlineSeparation;
            var setLines = function (lines) {
                var x = 0;
                _this.lineStarts = [];
                _this.lineWidths = [];
                lodash_1.forEach(lines, function (line, idx) {
                    if (idx > 0) {
                        x += barlineSep * 10;
                    }
                    _this.lineStarts.push(x);
                    var width = lineWidths[line].tenths;
                    _this.lineWidths.push(width);
                    x += width;
                });
                _this.model.satieAttribsOffset = x + 8 + clefOffset;
                cursor.segmentX += x;
            };
            switch (this.model.barStyle.data) {
                case musicxml_interfaces_1.BarStyleType.LightHeavy:
                    setLines(["light barline", "heavy barline"]);
                    break;
                case musicxml_interfaces_1.BarStyleType.LightLight:
                    setLines(["light barline", "light barline"]);
                    break;
                case musicxml_interfaces_1.BarStyleType.HeavyHeavy:
                    setLines(["heavy barline", "heavy barline"]);
                    break;
                case musicxml_interfaces_1.BarStyleType.HeavyLight:
                    setLines(["heavy barline", "light barline"]);
                    break;
                case musicxml_interfaces_1.BarStyleType.Regular:
                case musicxml_interfaces_1.BarStyleType.Dashed:
                case musicxml_interfaces_1.BarStyleType.Dotted:
                case musicxml_interfaces_1.BarStyleType.Short:
                case musicxml_interfaces_1.BarStyleType.Tick:
                    setLines(["light barline"]);
                    break;
                case musicxml_interfaces_1.BarStyleType.Heavy:
                    setLines(["heavy barline"]);
                    break;
                case musicxml_interfaces_1.BarStyleType.None:
                    setLines([]);
                    break;
                default:
                    throw new Error("Not implemented");
            }
            this.renderedWidth = cursor.segmentX - this.x + 8;
        }
        return Layout;
    }());
    BarlineModel.Layout = Layout;
    Layout.prototype.expandPolicy = "none";
    Layout.prototype.renderClass = document_1.Type.Barline;
    Layout.prototype.boundingBoxes = [];
    Object.freeze(Layout.prototype.boundingBoxes);
})(BarlineModel || (BarlineModel = {}));
/**
 * Registers Barline in the factory structure passed in.
 */
function Export(constructors) {
    constructors[document_1.Type.Barline] = BarlineModel;
}
exports.default = Export;
//# sourceMappingURL=implBarline_barlineModel.js.map