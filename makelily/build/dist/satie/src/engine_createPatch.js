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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var _a;
var musicxml_interfaces_1 = require("musicxml-interfaces");
var builders_1 = require("musicxml-interfaces/builders");
var lodash_1 = require("lodash");
var invariant_1 = __importDefault(require("invariant"));
var document_1 = require("./document");
var private_chordUtil_1 = require("./private_chordUtil");
var private_metre_checkBeaming_1 = require("./private_metre_checkBeaming");
var private_metre_modifyRest_1 = require("./private_metre_modifyRest");
var private_util_1 = require("./private_util");
function _prependPatch() {
    var prefix = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        prefix[_i] = arguments[_i];
    }
    return function __prependPatch(patch) {
        patch.p = prefix.concat(patch.p);
        return patch;
    };
}
function genUUID() {
    var MAX_SAFE_INTEGER = 9007199254740991;
    return Math.floor(Math.random() * MAX_SAFE_INTEGER);
}
function moreImportant(type, model, doc) {
    switch (type) {
        case document_1.Type.Print:
            return !doc.modelHasType(model, document_1.Type.VisualCursor);
        case document_1.Type.Grouping:
            return !doc.modelHasType(model, document_1.Type.Print, document_1.Type.VisualCursor);
        case document_1.Type.FiguredBass:
            return !doc.modelHasType(model, document_1.Type.Print, document_1.Type.Grouping, document_1.Type.VisualCursor);
        case document_1.Type.Attributes:
            return !doc.modelHasType(model, document_1.Type.Print, document_1.Type.Grouping, document_1.Type.FiguredBass, document_1.Type.VisualCursor);
        case document_1.Type.Sound:
            return !doc.modelHasType(model, document_1.Type.Print, document_1.Type.Grouping, document_1.Type.FiguredBass, document_1.Type.Attributes, document_1.Type.VisualCursor);
        case document_1.Type.Direction:
            return !doc.modelHasType(model, document_1.Type.Print, document_1.Type.Grouping, document_1.Type.FiguredBass, document_1.Type.Attributes, document_1.Type.Sound, document_1.Type.VisualCursor);
        case document_1.Type.Harmony:
            return false;
        case document_1.Type.Proxy:
            return false;
        case document_1.Type.Spacer:
            return false;
        case document_1.Type.Chord:
        case document_1.Type.VisualCursor:
            return true;
    }
    return false;
}
var StaffBuilder = /** @class */ (function () {
    function StaffBuilder(segment, document, idx) {
        this._patches = [];
        this._segment = segment;
        this._document = document;
        this._idx = idx;
    }
    Object.defineProperty(StaffBuilder.prototype, "patches", {
        get: function () {
            return this._patches.slice();
        },
        enumerable: true,
        configurable: true
    });
    StaffBuilder.prototype.at = function (idx) {
        this._idx = idx;
        return this;
    };
    StaffBuilder.prototype.next = function () {
        ++this._idx;
        return this;
    };
    StaffBuilder.prototype.atDiv = function (div, type) {
        var currDiv = 0;
        for (var i = 0; i < this._segment.length; ++i) {
            if (div < currDiv + this._segment[i].divCount ||
                div === currDiv + this._segment[i].divCount &&
                    moreImportant(type, this._segment[i], this._document)) {
                var start = currDiv;
                var end = currDiv + this._segment[i].divCount;
                if (div === start && moreImportant(type, this._segment[i], this._document)) {
                    return this.at(i);
                }
                else if (div === end) {
                    return this.at(i + 1);
                }
                else {
                    var s1 = div - start;
                    var s2 = end - div;
                    return this
                        .at(i)
                        .setDivCount(s1)
                        .next()
                        .insertSpacer(s2)
                        .at(i + 1);
                }
            }
            currDiv += this._segment[i].divCount;
        }
        var diff = div - currDiv;
        if (diff) {
            // Note: we should enforce this to not be possible, since the staff segment should
            // always be full.
            return this
                .at(this._segment.length)
                .insertSpacer(diff)
                .next();
        }
        return this.at(this._segment.length);
    };
    StaffBuilder.prototype.setDivCount = function (divCount) {
        this._patches = this._patches.concat({
            oi: divCount,
            od: this._segment[this._idx].divCount,
            p: [this._idx, "divCount"],
        });
        return this;
    };
    StaffBuilder.prototype.barline = function (builder) {
        var model = this._segment[this._idx];
        invariant_1.default(model, "no such model");
        invariant_1.default(this._document.modelHasType(model, document_1.Type.Barline), "model is not barline");
        this._patches = this._patches.concat(builders_1.patchBarline(model, builder).map(_prependPatch(this._idx)));
        return this;
    };
    StaffBuilder.prototype.insertBarline = function (builder) {
        var li = builders_1.buildBarline(builder);
        var p = [this._idx];
        this._patches = this._patches.concat({ li: li, p: p });
        return this;
    };
    StaffBuilder.prototype.attributes = function (builder) {
        var model = this._segment[this._idx];
        invariant_1.default(model, "no such model");
        invariant_1.default(this._document.modelHasType(model, document_1.Type.Attributes), "model is not attributes");
        this._patches = this._patches.concat(builders_1.patchAttributes(model, builder).map(_prependPatch(this._idx)));
        return this;
    };
    StaffBuilder.prototype.insertAttributes = function (builder) {
        var li = builders_1.buildAttributes(builder);
        var p = [this._idx];
        this._patches = this._patches.concat({ li: li, p: p });
        return this;
    };
    StaffBuilder.prototype.direction = function (builder) {
        var model = this._segment[this._idx];
        invariant_1.default(model, "no such model");
        invariant_1.default(this._document.modelHasType(model, document_1.Type.Direction), "model is not direction");
        this._patches = this._patches.concat(builders_1.patchDirection(model, builder).map(_prependPatch(this._idx)));
        return this;
    };
    StaffBuilder.prototype.insertDirection = function (builder) {
        if (typeof builder === "function") {
            var li_1 = builders_1.buildDirection(builder);
            var p_1 = [this._idx];
            this._patches = this._patches.concat({ li: li_1, p: p_1 });
            return this;
        }
        var p = [this._idx];
        var li = private_util_1.cloneObject(builder);
        li._class = "Direction";
        this._patches = this._patches.concat({ li: li, p: p });
        return this;
    };
    StaffBuilder.prototype.print = function (builder) {
        var model = this._segment[this._idx];
        invariant_1.default(model, "no such model");
        invariant_1.default(this._document.modelHasType(model, document_1.Type.Print), "model is not Print");
        this._patches = this._patches.concat(builders_1.patchPrint(model, builder).map(_prependPatch(this._idx)));
        return this;
    };
    StaffBuilder.prototype.insertPrint = function (builder) {
        var li = builders_1.buildPrint(builder);
        var p = [this._idx];
        this._patches = this._patches.concat({ li: li, p: p });
        return this;
    };
    StaffBuilder.prototype.insertSpacer = function (divs) {
        this._patches = this._patches.concat({
            li: {
                _class: "Spacer",
                divCount: divs,
            },
            p: [this._idx],
        });
        return this;
    };
    StaffBuilder.prototype.remove = function () {
        this._patches = this._patches.concat({
            p: [this._idx],
            ld: this._segment[this._idx]
        });
        return this;
    };
    return StaffBuilder;
}());
exports.StaffBuilder = StaffBuilder;
var VoiceBuilder = /** @class */ (function () {
    function VoiceBuilder(segment, document, idx) {
        this._patches = [];
        this._segment = segment;
        this._document = document;
        this._idx = idx;
    }
    Object.defineProperty(VoiceBuilder.prototype, "patches", {
        get: function () {
            return this._patches.slice();
        },
        enumerable: true,
        configurable: true
    });
    VoiceBuilder.prototype.at = function (idx) {
        this._idx = idx;
        return this;
    };
    VoiceBuilder.prototype.next = function () {
        ++this._idx;
        return this;
    };
    VoiceBuilder.prototype.addVisualCursor = function () {
        this._patches = this._patches.concat({
            li: {
                _class: "VisualCursor",
            },
            p: [this._idx],
        });
        return this;
    };
    VoiceBuilder.prototype.note = function (noteIDX, builder) {
        var model = this._segment[this._idx];
        invariant_1.default(model, "no such model");
        invariant_1.default(this._document.modelHasType(model, document_1.Type.Chord), "model is not a chord");
        var note = model[noteIDX];
        invariant_1.default(note, "invalid note");
        this._patches = this._patches.concat(builders_1.patchNote(note, builder).map(_prependPatch(this._idx, "notes", noteIDX)));
        return this;
    };
    VoiceBuilder.prototype.insertChord = function (builders) {
        invariant_1.default(!isNaN(this._idx), "%s must be a number", this._idx);
        var li = builders.map(function (builder) { return builders_1.buildNote(builder); });
        li._class = "Chord";
        invariant_1.default(li[0].noteType.duration, "Invalid note type");
        var p = [this._idx];
        this._patches = this._patches.concat({ li: li, p: p });
        return this;
    };
    VoiceBuilder.prototype.insertNote = function (position, builder) {
        var model = this._segment[this._idx];
        invariant_1.default(model, "no such model");
        invariant_1.default(this._document.modelHasType(model, document_1.Type.Chord), "model is not a chord");
        var li = builders_1.buildNote(builder);
        var chord = model;
        invariant_1.default(chord[position - 1] || chord[position + 1] || !chord.length, "Invalid position for note");
        invariant_1.default(li.noteType.duration, "Invalid note type");
        var p = [this._idx, "notes", position];
        this._patches = this._patches.concat({ p: p, li: li });
        return this;
    };
    VoiceBuilder.prototype.remove = function () {
        this._patches = this._patches.concat({
            p: [this._idx],
            ld: this._segment[this._idx]
        });
        return this;
    };
    return VoiceBuilder;
}());
exports.VoiceBuilder = VoiceBuilder;
var PartBuilder = /** @class */ (function () {
    function PartBuilder(part, document) {
        this._patches = [];
        this._part = part;
        this._document = document;
    }
    Object.defineProperty(PartBuilder.prototype, "patches", {
        get: function () {
            return this._patches.slice();
        },
        enumerable: true,
        configurable: true
    });
    PartBuilder.prototype.voice = function (voiceID, builder, idx) {
        var voice = this._part ? this._part.voices[voiceID] : null;
        invariant_1.default(!this._part || Boolean(voice), "invalid voice");
        this._patches = this._patches.concat(builder(new VoiceBuilder(voice, this._document, idx))
            .patches
            .map(_prependPatch("voices", voiceID)));
        return this;
    };
    PartBuilder.prototype.staff = function (staffID, builder, idx) {
        var staff = this._part ? this._part.staves[staffID] : null;
        invariant_1.default(!this._part || Boolean(staff), "invalid staff");
        this._patches = this._patches.concat(builder(new StaffBuilder(staff, this._document, idx))
            .patches
            .map(_prependPatch("staves", staffID)));
        return this;
    };
    return PartBuilder;
}());
exports.PartBuilder = PartBuilder;
var MeasureBuilder = /** @class */ (function () {
    function MeasureBuilder(measure, document) {
        this._patches = [];
        this._measure = measure;
        this._document = document;
    }
    Object.defineProperty(MeasureBuilder.prototype, "patches", {
        get: function () {
            return this._patches.slice();
        },
        enumerable: true,
        configurable: true
    });
    MeasureBuilder.prototype.part = function (partID, builder) {
        var part = this._measure ? this._measure.parts[partID] : null;
        invariant_1.default(!this._measure || Boolean(part), "invalid part id");
        this._patches = this._patches.concat(builder(new PartBuilder(part, this._document))
            .patches
            .map(_prependPatch("parts", partID)));
        return this;
    };
    return MeasureBuilder;
}());
exports.MeasureBuilder = MeasureBuilder;
var DocumentBuilder = /** @class */ (function () {
    function DocumentBuilder(doc) {
        this._patches = [];
        this._doc = doc;
    }
    Object.defineProperty(DocumentBuilder.prototype, "patches", {
        get: function () {
            return this._patches.slice();
        },
        enumerable: true,
        configurable: true
    });
    DocumentBuilder.prototype.measure = function (measureUUID, builder) {
        var measure = lodash_1.find(this._doc.measures, function (it) { return it.uuid === measureUUID; });
        invariant_1.default(Boolean(measure), "invalid measure uuid " + measureUUID);
        this._patches = this._patches.concat(builder(new MeasureBuilder(measure, this._doc))
            .patches
            .map(_prependPatch(measureUUID)));
        return this;
    };
    DocumentBuilder.prototype.insertMeasure = function (measureIndex, builder, uuid) {
        if (uuid === void 0) { uuid = genUUID(); }
        this._patches = this._patches.concat({
            li: {
                uuid: uuid,
            },
            p: ["measures", measureIndex],
        });
        this._patches = this._patches.concat(builder(new MeasureBuilder(null, this._doc))
            .patches
            .map(_prependPatch(uuid)));
        return this;
    };
    DocumentBuilder.prototype.removeMeasure = function (measureIndex) {
        this._patches = this._patches.concat({
            ld: JSON.parse(JSON.stringify(this._doc.measures[measureIndex])),
            p: ["measures", measureIndex],
        });
        return this;
    };
    return DocumentBuilder;
}());
exports.DocumentBuilder = DocumentBuilder;
var ModelMetreMutationSpec = /** @class */ (function () {
    function ModelMetreMutationSpec(spec, originalModel) {
        lodash_1.extend(this, spec);
        this._originalModel = originalModel;
    }
    ModelMetreMutationSpec.prototype.toSpec = function () {
        var _this = this;
        if (!this._originalModel) {
            throw new Error("Only valid for mutations!");
        }
        var originalModel = private_util_1.cloneObject(this._originalModel);
        if (originalModel._class === "Chord" || originalModel.length) {
            var chordModel = originalModel;
            lodash_1.forEach(chordModel, function (c) {
                c.noteType.duration = _this.newCount;
                if (_this.rest) {
                    c.rest = c.rest || {};
                    delete c.pitch;
                }
                else {
                    delete c.rest;
                }
                if (_this.newTimeModification) {
                    c.timeModification = _this.newTimeModification;
                }
                else {
                    delete c.timeModification;
                }
                if (!isNaN(_this.newDots)) {
                    c.dots = lodash_1.times(_this.newDots, function () { return ({}); });
                }
                else {
                    delete c.dots;
                }
            });
            return chordModel;
        }
        else {
            return originalModel;
        }
    };
    return ModelMetreMutationSpec;
}());
exports.ModelMetreMutationSpec = ModelMetreMutationSpec;
function getMutationInfo(document, patches) {
    var segments = {};
    var attributes = {};
    var elementInfos = {};
    var elementInfoByChord = {};
    patches.forEach(function (patch) {
        if (patch.p[0] === "measures") {
            // XXX: implement!
            return;
        }
        var measureUUID = parseInt(patch.p[0], 10);
        var measure = lodash_1.find(document.measures, function (doc) { return doc.uuid === measureUUID; });
        if (!measure) {
            // TODO: validate blank measures
            return;
        }
        if (patch.p[1] !== "parts") {
            return;
        }
        var part = measure.parts[patch.p[2]];
        invariant_1.default(part, "part " + patch.p[2] + " should exist in measure " + measureUUID);
        if (patch.p[3] === "staves") {
            return;
        }
        invariant_1.default(patch.p[3] === "voices", "only voices are supported here");
        var voice = part.voices[patch.p[4]];
        invariant_1.default(voice, "expected to find voice " + patch.p[4] + " in part " + patch.p[2] + " in measure " + measureUUID);
        var segID = patch.p.slice(0, 5).join("++");
        if (!segments[segID]) {
            segments[segID] = voice;
            var currDiv_1 = 0;
            attributes[segID] = document.search(part.staves[1], 0, document_1.Type.Attributes)[0]._snapshot;
            var time_1 = attributes[segID].time; // TODO: TS changes
            var divisions_1 = attributes[segID].divisions;
            elementInfos[segID] = voice.reduce(function (elementInfo, model, idx) {
                if (!document.modelHasType(model, document_1.Type.Chord)) {
                    return elementInfo.concat(new ModelMetreMutationSpec({
                        idx: idx,
                        oldIdx: idx,
                        start: currDiv_1,
                        previousDivisions: 0,
                        newDivisions: 0,
                        newCount: 0,
                        newDots: 0,
                        newTimeModification: null,
                        time: time_1,
                        rest: true,
                        forced: false,
                        beam: null,
                        touched: false,
                    }, model));
                }
                var divs = private_chordUtil_1.divisions(model, { time: time_1, divisions: divisions_1 });
                var theRest = private_chordUtil_1.rest(model);
                var info = new ModelMetreMutationSpec({
                    idx: idx,
                    oldIdx: idx,
                    start: currDiv_1,
                    previousDivisions: divs,
                    newDivisions: divs,
                    newCount: private_chordUtil_1.count(model),
                    newDots: private_chordUtil_1.dots(model),
                    newTimeModification: private_chordUtil_1.timeModification(model),
                    time: time_1,
                    rest: !!theRest,
                    forced: theRest && ("_force" in theRest),
                    beam: private_chordUtil_1.beams(model),
                    touched: false,
                }, model);
                elementInfoByChord[model.key] = info;
                currDiv_1 += divs;
                return elementInfo.concat(info);
            }, []);
        }
        var divisions = attributes[segID].divisions;
        if (patch.p.length === 6) {
            if (patch.li) {
                var isChord = patch.li._class === "Chord";
                var b = isChord ? private_chordUtil_1.beams(patch.li) : null;
                var c = isChord ? private_chordUtil_1.count(patch.li) : 0;
                var d = isChord ? private_chordUtil_1.dots(patch.li) : 0;
                var tm = isChord ? private_chordUtil_1.timeModification(patch.li) : null;
                var theRest = private_chordUtil_1.rest(patch.li);
                var divs = isChord ?
                    private_chordUtil_1.divisions(patch.li, { time: attributes[segID].time, divisions: divisions }) :
                    0;
                var start = void 0;
                var spliceIdx = parseInt(patch.p[5], 10);
                invariant_1.default(lodash_1.isInteger(spliceIdx) && !isNaN(spliceIdx), "Expected an integer");
                if (spliceIdx === 0) {
                    start = 0;
                }
                else {
                    start = elementInfos[segID][spliceIdx - 1].newDivisions + elementInfos[segID][spliceIdx - 1].start;
                }
                var newInfo = new ModelMetreMutationSpec({
                    idx: spliceIdx,
                    oldIdx: undefined,
                    newCount: c,
                    newDivisions: divs,
                    newDots: d,
                    previousDivisions: 0,
                    newTimeModification: tm,
                    start: start,
                    time: attributes[segID].time,
                    rest: !!theRest,
                    forced: theRest && (typeof theRest !== "boolean") && ("_force" in theRest),
                    beam: b,
                    touched: true,
                });
                for (var i = spliceIdx; i < elementInfos[segID].length; ++i) {
                    elementInfos[segID][i].start += divs;
                    elementInfos[segID][i].idx += 1;
                }
                elementInfos[segID].splice(spliceIdx, 0, newInfo);
            }
            if (patch.ld) {
                var divs = patch.ld._class === "Chord" ?
                    private_chordUtil_1.divisions(patch.ld, { time: attributes[segID].time, divisions: divisions }) :
                    0;
                var spliceIdx = parseInt(patch.p[5], 10);
                elementInfos[segID].splice(spliceIdx, 1);
                for (var i = spliceIdx; i < elementInfos[segID].length; ++i) {
                    elementInfos[segID][i].start -= divs;
                    elementInfos[segID][i].idx -= 1;
                }
            }
            return;
        }
        var el = voice[patch.p[5]];
        invariant_1.default(el, "expected to find element $" + patch.p[5] + " in part " + patch.p[2] + " in voice " + patch.p[4] + " in measure " + measureUUID);
        if (!document.modelHasType(el, document_1.Type.Chord) || patch.p[6] !== "notes" || patch.p[7] !== 0) {
            return;
        }
        var info = elementInfoByChord[el.key];
        if (patch.p.length === 9 && patch.p[8] === "pitch") {
            info.touched = true;
            if (patch.oi !== undefined) {
                info.rest = !patch.oi;
            }
            else if (patch.od !== undefined) {
                info.rest = true;
            }
        }
        if (patch.p.length === 9 && patch.p[8] === "rest") {
            info.touched = true;
            if (patch.oi !== undefined) {
                info.rest = !!patch.oi && !patch.oi;
            }
            else if (patch.od !== undefined) {
                info.rest = false;
            }
        }
        if (patch.p[8] === "noteType" && patch.p[9] === "duration") {
            if (patch.oi) {
                info.newCount = patch.oi;
            }
            else {
                throw new Error("noteType is required...");
            }
        }
        if (patch.p.length === 9 && patch.p[8] === "dots") {
            if (patch.oi) {
                info.newDots = patch.oi.length;
            }
            else if (patch.od) {
                info.newDots = 0;
            }
        }
        info.newDivisions = private_chordUtil_1.divisions({
            count: info.newCount,
            dots: info.newDots,
            timeModification: info.newTimeModification
        }, {
            time: info.time,
            divisions: divisions,
        });
        if (info.newDivisions !== info.previousDivisions) {
            info.touched = true;
        }
    });
    return {
        segments: segments,
        attributes: attributes,
        elementInfos: elementInfos,
        elementInfoByChord: elementInfoByChord
    };
}
function fixMetre(document, patches) {
    patches = patches.slice();
    var attributes;
    var elementInfos;
    var mi = getMutationInfo(document, patches);
    attributes = mi.attributes;
    elementInfos = mi.elementInfos;
    lodash_1.forEach(elementInfos, function (voiceInfo, key) {
        var anyChanged = voiceInfo.some(function (n) { return n.touched; });
        if (!anyChanged) {
            return;
        }
        var restSpecs = private_metre_modifyRest_1.simplifyRests(voiceInfo, document, attributes[key]);
        patches = patches.concat(restSpecs.map(function (spec, idx) { return (lodash_1.extend({}, spec, {
            p: key.split("++").concat(spec.p),
        })); }));
    });
    return patches;
}
function fixBarlines(doc, patches) {
    // XXX: FIXME
    // const measureCount = doc.measures.length;
    // const previouslyLastMeasure = doc.measures[measureCount - 1];
    // forEach(previouslyLastMeasure.parts, (part, partName) => {
    //     const segment = part.staves[1];
    //     const barlineIdx = findLastIndex(segment, el => doc.modelHasType(el, Type.Barline));
    //     patches = patches.slice();
    //     patches.forEach(patch => {
    //         if (patch.p[0] === "measures" &&
    //                 patch.p.length === 2 &&
    //                 patch.p[1] === previouslyLastMeasure.idx + 1) {
    //             const removeDoubleBarline = createPatch(false, doc,
    //                 previouslyLastMeasure.uuid, partName,
    //                 part => part.staff(1, staff => staff
    //                     .barline(barline => barline
    //                         .barStyle(barStyle => barStyle
    //                             .data(BarStyleType.Regular)
    //                         )
    //                     ),
    //                     barlineIdx
    //                 )
    //             );
    //             patches = patches.concat(removeDoubleBarline);
    //         }
    //     });
    // });
    return patches;
}
function fixCursor(doc, patches) {
    var elementInfos = getMutationInfo(doc, patches).elementInfos;
    var newCursor = patches.filter(function (patch) { return patch.li && patch.li._class === "VisualCursor"; });
    if (!newCursor.length) {
        return patches;
    }
    invariant_1.default(newCursor.length === 1, "Limit 1 cursor operation per patch");
    patches = patches.slice();
    lodash_1.forEach(doc.measures, function (measure) {
        lodash_1.forEach(measure.parts, function (part, partName) {
            lodash_1.forEach(part.voices, function (voice, voiceIDX) {
                if (!voice) {
                    return;
                }
                var segID = [measure.uuid, "parts", partName, "voices", voiceIDX].join("++");
                var segInfo = elementInfos[segID];
                if (segInfo) {
                    var offset_1 = 0;
                    lodash_1.forEach(segInfo, function (element) {
                        if (!isNaN(element.idx) && !isNaN(element.oldIdx) &&
                            doc.modelHasType(voice[element.oldIdx], document_1.Type.VisualCursor)) {
                            patches.push({
                                p: [measure.uuid, "parts", partName, "voices", voiceIDX, element.idx + offset_1],
                                ld: JSON.parse(JSON.stringify(voice[element.oldIdx])),
                            });
                            offset_1 -= 1;
                        }
                    });
                }
                else {
                    var offset_2 = 0;
                    lodash_1.forEach(voice, function (el, idx) {
                        if (doc.modelHasType(el, document_1.Type.VisualCursor)) {
                            patches.push({
                                p: [measure.uuid, "parts", partName, "voices", voiceIDX, idx + offset_2],
                                ld: JSON.parse(JSON.stringify(el)),
                            });
                            offset_2 -= 1;
                        }
                    });
                }
            });
        });
    });
    return patches;
}
var COUNT_TO_BEAMS = (_a = {},
    _a[musicxml_interfaces_1.Count.Eighth] = 1,
    _a[musicxml_interfaces_1.Count._16th] = 2,
    _a[musicxml_interfaces_1.Count._32nd] = 3,
    _a[musicxml_interfaces_1.Count._64th] = 4,
    _a[musicxml_interfaces_1.Count._128th] = 5,
    _a[musicxml_interfaces_1.Count._256th] = 6,
    _a[musicxml_interfaces_1.Count._512th] = 7,
    _a);
function addBeams(document, patches) {
    patches = patches.slice();
    var _a = getMutationInfo(document, patches), segments = _a.segments, elementInfos = _a.elementInfos;
    lodash_1.forEach(elementInfos, function (voiceInfo, key) {
        var segment = segments[key];
        var time = voiceInfo[0].time;
        var stdBP = private_metre_checkBeaming_1.getBeamingPattern(time); // TODO: TS changes in bar
        // const cleanBP = getBeamingPattern(time, "clean");
        // const altBP = getBeamingPattern(time, "alt");
        var beamGroup = [];
        var beamBeams = [];
        var inCandidate = [];
        var beamingPattern = stdBP;
        function applyCandidate() {
            // Remove all rests at the end and beginning.
            var start = lodash_1.findIndex(beamGroup, function (i) { return !voiceInfo[i].rest; });
            var end = lodash_1.findLastIndex(beamGroup, function (i) { return !voiceInfo[i].rest; });
            beamBeams = beamBeams.slice(start, end + 1);
            beamGroup = beamGroup.slice(start, end + 1);
            if (beamGroup.length < 2) {
                return;
            }
            // Mark elements in the candidate
            beamGroup.forEach(function (b) { return inCandidate[b] = true; });
            if (!lodash_1.some(beamGroup, function (i) { return voiceInfo[i].touched; })) {
                // We did not modify this beam group, so don't change it here.
                return;
            }
            patches = patches.concat(beamGroup.map(function (i, j) {
                var type = null;
                var beams = lodash_1.times(beamBeams[j], function (beamNumber) {
                    if (i === beamGroup[0] || beamBeams[j - 1] < beamNumber + 1) {
                        if (i === lodash_1.last(beamGroup) || beamBeams[j + 1] < beamNumber + 1) {
                            // HACK HACK HACK -- it's more complex than this
                            type = (j === 0 ? musicxml_interfaces_1.BeamType.ForwardHook : musicxml_interfaces_1.BeamType.BackwardHook);
                        }
                        else {
                            type = musicxml_interfaces_1.BeamType.Begin;
                        }
                    }
                    else if (i === lodash_1.last(beamGroup) || beamBeams[j + 1] < beamNumber + 1) {
                        type = musicxml_interfaces_1.BeamType.End;
                    }
                    else {
                        type = musicxml_interfaces_1.BeamType.Continue;
                    }
                    return builders_1.buildBeam(function (beam) { return beam
                        .number(beamNumber + 1)
                        .type(type); });
                });
                var miniP = {
                    p: key.split("++").concat([i, "notes", 0, "beams"]),
                    oi: beams
                };
                if (voiceInfo[i].beam) {
                    miniP.od = voiceInfo[i].beam;
                }
                return miniP;
            }));
        }
        var bpIDX = -1;
        var divisionsInCurrentBucket = 0;
        function advanceBP(divs) {
            divisionsInCurrentBucket -= divs;
            if (divisionsInCurrentBucket <= 0) {
                applyCandidate();
                beamGroup = [];
                beamBeams = [];
                ++bpIDX;
                if (!beamingPattern[bpIDX]) {
                    // End of bar / overflowed bar
                    divisionsInCurrentBucket = Infinity;
                    return;
                }
                var next = private_chordUtil_1.divisions(beamingPattern[bpIDX], { time: time, divisions: segment.divisions });
                divisionsInCurrentBucket += next;
            }
        }
        advanceBP(0);
        voiceInfo.forEach(function (elInfo, originalIdx) {
            if (!elInfo.newDivisions) {
                // Skip this non-note.
                return;
            }
            var divs = private_chordUtil_1.divisions({
                count: elInfo.newCount,
                dots: elInfo.newDots,
            }, {
                time: time,
                divisions: segment.divisions,
            }, true);
            var isCandidate = private_chordUtil_1.countToIsBeamable[elInfo.newCount] &&
                (!elInfo.rest || elInfo.beam) &&
                divs <= divisionsInCurrentBucket;
            if (isCandidate) {
                beamGroup.push(originalIdx);
                beamBeams.push(COUNT_TO_BEAMS[elInfo.newCount]);
            }
            else {
                applyCandidate();
                beamGroup = [];
                beamBeams = [];
            }
            advanceBP(divs);
        });
        applyCandidate();
        // Now remove invalid beams!
        voiceInfo.forEach(function (elInfo, i) {
            if (elInfo.beam && !inCandidate[i]) {
                patches = patches.concat({
                    p: key.split("++").concat([i, "notes", 0, "beams"]),
                    od: elInfo.beam
                });
            }
        });
    });
    return patches;
}
function cleanupPatches(document, patches) {
    patches = fixMetre(document, patches);
    patches = addBeams(document, patches);
    patches = fixBarlines(document, patches);
    patches = fixCursor(document, patches);
    return patches;
}
function createPatch(isPreview, document, builderOrMeasure, part, partBuilder) {
    var patches;
    if (builderOrMeasure instanceof Array) {
        patches = cleanupPatches(document, builderOrMeasure);
    }
    else if (typeof builderOrMeasure === "function") {
        invariant_1.default(part === undefined && partBuilder === undefined, "createPatch: invalid usage");
        var builder = builderOrMeasure;
        patches = builder(new DocumentBuilder(document)).patches;
        if (!isPreview) {
            patches = cleanupPatches(document, patches);
        }
    }
    else {
        var measure_1 = builderOrMeasure;
        var builder_1 = partBuilder;
        patches = createPatch(isPreview, document, function (document) { return document
            .measure(measure_1, function (measure) { return measure
            .part(part, builder_1); }); });
    }
    return patches;
}
exports.default = createPatch;
//# sourceMappingURL=engine_createPatch.js.map