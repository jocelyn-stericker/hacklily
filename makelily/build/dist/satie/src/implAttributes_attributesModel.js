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
var lodash_1 = require("lodash");
var invariant = require("invariant");
var document_1 = require("./document");
var private_chordUtil_1 = require("./private_chordUtil");
var private_part_1 = require("./private_part");
var private_attributesSnapshot_1 = require("./private_attributesSnapshot");
var implAttributes_clefData_1 = require("./implAttributes_clefData");
var implAttributes_attributesData_1 = require("./implAttributes_attributesData");
var AttributesModel = /** @class */ (function () {
    function AttributesModel(_a) {
        var _b = _a === void 0 ? { divisions: 0 } : _a, divisions = _b.divisions, partSymbol = _b.partSymbol, measureStyles = _b.measureStyles, staffDetails = _b.staffDetails, transposes = _b.transposes, staves = _b.staves, instruments = _b.instruments, directives = _b.directives, clefs = _b.clefs, times = _b.times, keySignatures = _b.keySignatures, footnote = _b.footnote, level = _b.level;
        this._class = "Attributes";
        /*---- I.1 IModel ---------------------------------------------------------------------------*/
        /** @prototype only */
        this._divCount = 0;
        this.divisions = divisions;
        this.partSymbol = partSymbol;
        this.measureStyles = measureStyles;
        this.staffDetails = staffDetails;
        this.transposes = transposes;
        this.staves = staves;
        this.instruments = instruments;
        this.directives = directives;
        this.clefs = clefs;
        this.times = times;
        this.keySignatures = keySignatures;
        this.footnote = footnote;
        this.level = level;
    }
    Object.defineProperty(AttributesModel.prototype, "divCount", {
        get: function () {
            return this._divCount;
        },
        set: function (count) {
            invariant(isFinite(count), "Count must be finite.");
            this._divCount = count;
        },
        enumerable: true,
        configurable: true
    });
    /*---- Implementation -----------------------------------------------------------------------*/
    AttributesModel.prototype.refresh = function (cursor) {
        this._parent = cursor.staffAttributes;
        if (!this._parent || !this._parent.divisions) {
            this.divisions = this.divisions || 1;
        }
        this._validateClef(cursor);
        this._validateTime(cursor);
        this._validateKey(cursor);
        this._validateStaves(cursor);
        this._validateStaffDetails(cursor);
        this._validateMeasureStyles(cursor);
        this._snapshot = private_attributesSnapshot_1.createAttributesSnapshot({
            before: cursor.staffAttributes || {},
            current: this,
            staff: cursor.staffIdx,
            measure: cursor.measureInstance.idx
        });
    };
    AttributesModel.prototype.getLayout = function (cursor) {
        if (!this._layout) {
            this._layout = [];
        }
        if (!this._layout[cursor.segmentInstance.owner]) {
            this._layout[cursor.segmentInstance.owner] = new AttributesModel.Layout();
        }
        var layout = this._layout[cursor.segmentInstance.owner];
        layout._refresh(this, this._snapshot, this._parent, cursor);
        return layout;
    };
    AttributesModel.prototype.toXML = function () {
        var j = this.toJSON();
        // Hack: we index staffDetails by 1-index staff, leaving a null at index 0, with MXML doesn't handle.
        j.staffDetails = j.staffDetails.filter(function (a) { return !!a; });
        j.clefs = j.clefs.filter(function (a) { return !!a; });
        j.keySignatures = j.keySignatures.filter(function (a) { return !!a; });
        return musicxml_interfaces_1.serializeAttributes(j) + "\n<forward><duration>" + this.divCount + "</duration></forward>\n";
    };
    AttributesModel.prototype.toJSON = function () {
        var _a = this, _class = _a._class, divisions = _a.divisions, partSymbol = _a.partSymbol, measureStyles = _a.measureStyles, staffDetails = _a.staffDetails, transposes = _a.transposes, staves = _a.staves, instruments = _a.instruments, directives = _a.directives, clefs = _a.clefs, times = _a.times, keySignatures = _a.keySignatures, footnote = _a.footnote, level = _a.level;
        return {
            _class: _class,
            divisions: divisions,
            partSymbol: partSymbol,
            measureStyles: measureStyles,
            staffDetails: staffDetails,
            transposes: transposes,
            staves: staves,
            instruments: instruments,
            directives: directives,
            clefs: clefs,
            times: times,
            keySignatures: keySignatures,
            footnote: footnote,
            level: level,
        };
    };
    AttributesModel.prototype.inspect = function () {
        return this.toXML();
    };
    AttributesModel.prototype.calcWidth = function () {
        return 0; // TODO
    };
    AttributesModel.prototype._validateClef = function (cursor) {
        var staffIdx = cursor.staffIdx;
        // Clefs must be an array
        if (!(this.clefs instanceof Array)) {
            cursor.patch(function (staff) { return staff.attributes(function (attributes) {
                return attributes.clefs([]);
            }); });
        }
        // Clefs must have a staff number and be sorted by staff number
        this.clefs.forEach(function (clef, clefIdx) {
            if (!clef) {
                return;
            }
            if (clef.number !== clefIdx) {
                cursor.patch(function (staff) { return staff.attributes(function (attributes) {
                    return attributes.clefsAt(clefIdx, function (clef) {
                        return clef.number(clefIdx);
                    });
                }); });
            }
        });
        // A clef is mandatory (we haven't implemented clef-less staves yet)
        if ((!this._parent || !this._parent.clef) && !this.clefs[staffIdx]) {
            cursor.patch(function (staff) { return staff.attributes(function (attributes) {
                return attributes
                    .clefsAt(0, null) // XXX: HACK to fix splice
                    .clefsAt(staffIdx, function (clef) {
                    return clef
                        .number(staffIdx)
                        .sign("G")
                        .line(2);
                });
            }); });
        }
        // Validate the given clef
        var clef = this.clefs[staffIdx];
        if (clef) {
            if (clef.sign !== clef.sign.toUpperCase()) {
                cursor.patch(function (staff) { return staff.attributes(function (attributes) {
                    return attributes.clefsAt(staffIdx, function (clefb) {
                        return clefb.sign(clef.sign.toUpperCase());
                    });
                }); });
            }
            if (clef.line && clef.line !== parseInt("" + clef.line, 10)) {
                cursor.patch(function (staff) { return staff.attributes(function (attributes) {
                    return attributes.clefsAt(staffIdx, function (clefb) {
                        return clefb.line(parseInt("" + clef.line, 10));
                    });
                }); });
            }
            // Clef lines can be inferred.
            if (!clef.line) {
                var sign = clef.sign;
                var standardClef_1 = lodash_1.find(implAttributes_clefData_1.standardClefs, { sign: sign });
                cursor.patch(function (staff) { return staff.attributes(function (attributes) {
                    return attributes.clefsAt(staffIdx, function (clefb) {
                        return clefb.line(standardClef_1 ? standardClef_1.line : 2);
                    });
                }); });
            }
        }
    };
    AttributesModel.prototype._validateTime = function (cursor) {
        // Times must be an array
        this.times = this.times || [];
        // A time signature is mandatory.
        if ((!this._parent || !this._parent.time) && !this.times[0]) {
            cursor.patch(function (staff) { return staff.attributes(function (attributes) {
                return attributes.timesAt(0, function (time) { return time
                    .symbol(musicxml_interfaces_1.TimeSymbolType.Common)
                    .beats(["4"])
                    .beatTypes([4]); });
            }); });
        }
    };
    AttributesModel.prototype._validateKey = function (cursor) {
        // Key signatures must be an array
        this.keySignatures = this.keySignatures || [];
        if ((!this._parent || !this._parent.keySignature) && !this.keySignatures[0]) {
            cursor.patch(function (staff) { return staff.attributes(function (attributes) {
                return attributes.keySignaturesAt(0, function (key) { return key
                    .fifths(0)
                    .mode("major"); });
            }); });
        }
        var ks = this.keySignatures[0];
        if (ks && (ks.keySteps || ks.keyAlters || ks.keyOctaves)) {
            if (ks.keySteps.length !== ks.keyAlters.length) {
                console.warn("Expected the number of steps to equal the number of alterations. " +
                    "Ignoring key.");
                cursor.patch(function (staff) { return staff.attributes(function (attributes) {
                    return attributes.keySignaturesAt(0, function (key) { return key
                        .fifths(0)
                        .keySteps(null)
                        .keyAccidentals(null)
                        .keyAlters(null); });
                }); });
            }
            if (ks.keyAccidentals && ks.keyAccidentals.length !== ks.keySteps.length) {
                if (ks.keyAccidentals.length) {
                    console.warn("Currently, if `key-accidentals` are specified, they must be " +
                        "specified for all steps in a key signature due to a limitation " +
                        "in musicxml-interfaces. Ignoring `key-accidentals`");
                }
                cursor.patch(function (staff) { return staff.attributes(function (attributes) {
                    return attributes.keySignaturesAt(0, function (key) { return key
                        .keyAccidentals(null); });
                }); });
            }
            if (ks.keyOctaves) {
                // Let's sort them (move to prefilter?)
                var keyOctaves_1 = [];
                lodash_1.forEach(ks.keyOctaves, function (octave) {
                    keyOctaves_1[octave.number - 1] = octave;
                });
                if (!lodash_1.isEqual(ks.keyOctaves, keyOctaves_1)) {
                    cursor.patch(function (staff) { return staff.attributes(function (attributes) {
                        return attributes.keySignaturesAt(0, function (key) { return key
                            .keyOctaves(keyOctaves_1); });
                    }); });
                }
            }
        }
    };
    AttributesModel.prototype._validateStaffDetails = function (cursor) {
        // Staff details must be an array
        this.staffDetails = this.staffDetails || [];
        // Staff details must have a staff number
        var sSoFar = 0;
        this.staffDetails.forEach(function (staffDetails, i) {
            if (staffDetails) {
                ++sSoFar;
                if (!staffDetails.number) {
                    cursor.patch(function (staff) { return staff.attributes(function (attributes) {
                        return attributes.staffDetailsAt(i, function (sd) {
                            return sd.number(sSoFar);
                        });
                    }); });
                }
            }
        });
        // Staff details must be indexed by staff
        var staffDetailsByNumber = this.staffDetails.reduce(function (staffDetails, staffDetail) {
            if (staffDetail) {
                staffDetails[staffDetail.number] = staffDetail;
            }
            return staffDetails;
        }, []);
        var needsSorting = this.staffDetails.length !== staffDetailsByNumber.length ||
            this.staffDetails.some(function (s, i) {
                if (!s && !staffDetailsByNumber[i]) {
                    return false;
                }
                return !lodash_1.isEqual(s, staffDetailsByNumber[i]);
            });
        if (needsSorting) {
            cursor.patch(function (staff) { return staff.attributes(function (attributes) {
                return attributes.staffDetails(staffDetailsByNumber);
            }); });
        }
        // Staff details are required. Staff lines are required
        if (!this.staffDetails[cursor.staffIdx]) {
            cursor.patch(function (staff) { return staff.attributes(function (attributes) {
                return attributes
                    .staffDetailsAt(0, null) // XXX: HACK
                    .staffDetailsAt(cursor.staffIdx, {
                    number: cursor.staffIdx,
                });
            }); });
        }
        if ((!this._parent || !this._parent.staffDetails ||
            !this._parent.staffDetails[cursor.staffIdx] ||
            !this._parent.staffDetails[cursor.staffIdx].staffLines) &&
            (!this.staffDetails[cursor.staffIdx] ||
                !this.staffDetails[cursor.staffIdx].staffLines)) {
            cursor.patch(function (staff) { return staff.attributes(function (attributes) {
                return attributes.staffDetailsAt(cursor.staffIdx, function (l) { return l.staffLines(5); });
            }); });
        }
    };
    AttributesModel.prototype._validateStaves = function (cursor) {
        var _this = this;
        this.staves = this.staves || 1; // FIXME!
        var currentPartId = cursor.segmentInstance.part;
        var currentPart = cursor.measureInstance.parts[currentPartId];
        lodash_1.times(this.staves, function (staffMinusOne) {
            var staff = staffMinusOne + 1;
            if (!currentPart.staves[staff]) {
                throw new Error("A staff is missing. The code to add it is not implemented.");
            }
        });
        if (this.staves > 1 && (!this._parent || !this._parent.partSymbol) && !this.partSymbol) {
            cursor.patch(function (staff) { return staff.attributes(function (attributes) {
                return attributes.partSymbol({
                    bottomStaff: 1,
                    topStaff: _this.staves,
                    type: musicxml_interfaces_1.PartSymbolType.Brace,
                });
            }); });
        }
        // HACK: Convert part group symbols to part symbols.
        // Obviously, this won't fly when we have multiple part groups
        var groups = private_part_1.groupsForPart(cursor.header.partList, cursor.segmentInstance.part);
        if (groups.length && (!this._parent || !this._parent.partSymbol) && !this.partSymbol) {
            cursor.patch(function (staff) { return staff.attributes(function (attributes) {
                return attributes.partSymbol({
                    bottomStaff: 1,
                    topStaff: 1,
                    type: musicxml_interfaces_1.PartSymbolType.Bracket
                });
            }); });
        }
    };
    AttributesModel.prototype._validateMeasureStyles = function (cursor) {
        if (!this.measureStyles) {
            cursor.patch(function (staff) { return staff.attributes(function (attributes) {
                return attributes.measureStyles([]);
            }); });
        }
    };
    return AttributesModel;
}());
(function (AttributesModel) {
    var Layout = /** @class */ (function () {
        function Layout() {
        }
        Layout.prototype._refresh = function (model, attributes, prevAttributes, cursor) {
            var _this = this;
            this.model = model;
            invariant(!!attributes, "Layout must be passed a model");
            this.clef = null;
            this.snapshotClef = null;
            this.clefSpacing = null;
            this.time = null;
            this.tsSpacing = null;
            this.keySignature = null;
            this.ksSpacing = null;
            this.measureNumberVisible = null;
            this.partSymbol = null;
            this.staffDetails = null;
            this.x = cursor.segmentX;
            this.division = cursor.segmentDivision;
            this.staffIdx = cursor.staffIdx;
            var isFirstInLine = cursor.lineBarOnLine === 0 && !this.division;
            var next = cursor.segmentInstance[cursor.segmentPosition + 1];
            var ksVisible = !implAttributes_attributesData_1.keysEqual(attributes, prevAttributes) || isFirstInLine;
            var tsVisible = !implAttributes_attributesData_1.timesEqual(attributes, prevAttributes);
            var clefVisible = !implAttributes_attributesData_1.clefsEqual(attributes, prevAttributes, cursor.segmentInstance.owner) || isFirstInLine;
            var partSymbolVisible = isFirstInLine && attributes.partSymbol &&
                attributes.partSymbol.bottomStaff === cursor.staffIdx;
            // Measure number
            if (!cursor.measureInstance.implicit && parseInt(cursor.measureInstance.number, 10) !== 1) {
                var measureNumbering = cursor.print ?
                    cursor.print.measureNumbering.data : "system";
                var firstInMeasure = cursor.segmentDivision === 0;
                var showNumberBecauseOfSystem = isFirstInLine && measureNumbering === "system";
                var showNumberBecauseOfMeasure = this.division === 0 && measureNumbering === "measure" && firstInMeasure;
                var shouldShowNumber = showNumberBecauseOfSystem || showNumberBecauseOfMeasure;
                if (shouldShowNumber) {
                    this.measureNumberVisible = cursor.measureInstance.number;
                }
            }
            /*---- Clef layout ------------------------------------*/
            var nextChord = cursor.factory.modelHasType(next, document_1.Type.Chord) ? next : null;
            this.snapshotClef = cursor.staffAttributes.clef;
            if (clefVisible) {
                var clef = attributes.clefs[cursor.staffIdx];
                this.x += implAttributes_attributesData_1.CLEF_INDENTATION;
                cursor.segmentX = this.x;
                var contextualSpacing = 0;
                this.clef = Object.create(clef, {
                    "defaultX": {
                        get: function () {
                            if (isFirstInLine) {
                                return _this.overrideX;
                            }
                            else {
                                return _this.overrideX - 10.5;
                            }
                        }
                    }
                });
                this.clef.defaultY = this.clef.defaultY || 0;
                this.clef.size = isFirstInLine ? musicxml_interfaces_1.SymbolSize.Full : musicxml_interfaces_1.SymbolSize.Cue;
                if (nextChord && !ksVisible && !tsVisible) {
                    if (private_chordUtil_1.hasAccidental(nextChord, cursor)) {
                        // TODO: what if there are more than 1 accidental?
                        contextualSpacing = 15;
                    }
                    else {
                        contextualSpacing = 25;
                    }
                }
                else {
                    contextualSpacing = 12.5;
                }
                if (!isFirstInLine) {
                    contextualSpacing -= 19.8;
                }
                this.clefSpacing = implAttributes_attributesData_1.clefWidth(attributes) + contextualSpacing;
            }
            else {
                this.clefSpacing = 0;
            }
            /*---- KS layout --------------------------------------*/
            if (ksVisible) {
                var keySignature = attributes.keySignatures[0];
                var contextualSpacing = 0;
                this.keySignature = Object.create(keySignature, {
                    defaultX: {
                        get: function () {
                            return _this.overrideX + _this.clefSpacing;
                        }
                    }
                });
                this.keySignature.defaultY = 0;
                if (nextChord && !tsVisible) {
                    if (private_chordUtil_1.hasAccidental(nextChord, cursor)) {
                        // TODO: what if there are more than 1 accidental?
                        contextualSpacing = 25;
                    }
                    else {
                        contextualSpacing = 15;
                    }
                }
                else {
                    contextualSpacing = 10;
                }
                this.ksSpacing = contextualSpacing + implAttributes_attributesData_1.keyWidth(attributes);
            }
            else {
                this.ksSpacing = 0;
            }
            /*---- TS layout --------------------------------------*/
            if (tsVisible) {
                var time = attributes.times[0];
                var contextualSpacing = 0;
                this.time = Object.create(time, {
                    defaultX: {
                        get: function () {
                            return _this.overrideX + _this.clefSpacing + _this.ksSpacing;
                        }
                    }
                });
                this.time.defaultY = 0;
                if (nextChord) {
                    if (private_chordUtil_1.hasAccidental(nextChord, cursor)) {
                        // TODO: what if there are more than 1 accidental?
                        contextualSpacing = 25;
                    }
                    else {
                        contextualSpacing = 15;
                    }
                }
                else {
                    contextualSpacing = 12.5;
                }
                if (!attributes.times[0].beatTypes) {
                    contextualSpacing = 0;
                }
                this.tsSpacing = contextualSpacing + implAttributes_attributesData_1.timeWidth(attributes);
            }
            else {
                this.tsSpacing = 0;
            }
            /*---- Part symbol ------------------------------------*/
            if (partSymbolVisible) {
                var partSymbol = cursor.staffAttributes.partSymbol;
                this.partSymbol = Object.create(partSymbol, {
                    defaultX: {
                        get: function () {
                            return 0;
                        }
                    }
                });
            }
            this.staffDetails = cursor.staffAttributes.staffDetails[this.staffIdx];
            /*---- Geometry ---------------------------------------*/
            cursor.segmentX += this.clefSpacing + this.tsSpacing + this.ksSpacing;
            this.renderedWidth = cursor.segmentX - this.x - 8;
        };
        return Layout;
    }());
    AttributesModel.Layout = Layout;
    Layout.prototype.expandPolicy = "none";
    Layout.prototype.renderClass = document_1.Type.Attributes;
    Layout.prototype.boundingBoxes = [];
    Object.freeze(Layout.prototype.boundingBoxes);
})(AttributesModel || (AttributesModel = {}));
/**
 * Registers Attributes in the factory structure passed in.
 */
function Export(constructors) {
    constructors[document_1.Type.Attributes] = AttributesModel;
}
(function (Export) {
    function createWarningLayout(cursor, prevAttributes, nextAttributes) {
        var warningLayout = new AttributesModel.Layout();
        console.log("Creating warning layout for ", nextAttributes);
        warningLayout._refresh(null, nextAttributes, prevAttributes, cursor);
        return warningLayout;
    }
    Export.createWarningLayout = createWarningLayout;
})(Export || (Export = {}));
exports.default = Export;
//# sourceMappingURL=implAttributes_attributesModel.js.map