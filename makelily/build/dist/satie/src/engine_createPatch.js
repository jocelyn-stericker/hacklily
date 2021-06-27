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
var _a;
import { BeamType, Count, } from "musicxml-interfaces";
import { buildNote, patchNote, buildBarline, patchBarline, buildBeam, buildAttributes, patchAttributes, buildDirection, patchDirection, buildPrint, patchPrint, } from "musicxml-interfaces/builders";
import { find, forEach, last, some, times, findIndex, findLastIndex, extend, isInteger, } from "lodash";
import invariant from "invariant";
import { Type, } from "./document";
import { count, dots, timeModification, divisions as calcDivisions, rest, countToIsBeamable, beams, } from "./private_chordUtil";
import { getBeamingPattern } from "./private_metre_checkBeaming";
import { simplifyRests } from "./private_metre_modifyRest";
import { cloneObject } from "./private_util";
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
        case Type.Print:
            return !doc.modelHasType(model, Type.VisualCursor);
        case Type.Grouping:
            return !doc.modelHasType(model, Type.Print, Type.VisualCursor);
        case Type.FiguredBass:
            return !doc.modelHasType(model, Type.Print, Type.Grouping, Type.VisualCursor);
        case Type.Attributes:
            return !doc.modelHasType(model, Type.Print, Type.Grouping, Type.FiguredBass, Type.VisualCursor);
        case Type.Sound:
            return !doc.modelHasType(model, Type.Print, Type.Grouping, Type.FiguredBass, Type.Attributes, Type.VisualCursor);
        case Type.Direction:
            return !doc.modelHasType(model, Type.Print, Type.Grouping, Type.FiguredBass, Type.Attributes, Type.Sound, Type.VisualCursor);
        case Type.Harmony:
            return false;
        case Type.Proxy:
            return false;
        case Type.Spacer:
            return false;
        case Type.Chord:
        case Type.VisualCursor:
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
                (div === currDiv + this._segment[i].divCount &&
                    moreImportant(type, this._segment[i], this._document))) {
                var start = currDiv;
                var end = currDiv + this._segment[i].divCount;
                if (div === start &&
                    moreImportant(type, this._segment[i], this._document)) {
                    return this.at(i);
                }
                else if (div === end) {
                    return this.at(i + 1);
                }
                else {
                    var s1 = div - start;
                    var s2 = end - div;
                    return this.at(i)
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
            return this.at(this._segment.length)
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
        invariant(model, "no such model");
        invariant(this._document.modelHasType(model, Type.Barline), "model is not barline");
        this._patches = this._patches.concat(patchBarline(model, builder).map(_prependPatch(this._idx)));
        return this;
    };
    StaffBuilder.prototype.insertBarline = function (builder) {
        var li = buildBarline(builder);
        var p = [this._idx];
        this._patches = this._patches.concat({ li: li, p: p });
        return this;
    };
    StaffBuilder.prototype.attributes = function (builder) {
        var model = this._segment[this._idx];
        invariant(model, "no such model");
        invariant(this._document.modelHasType(model, Type.Attributes), "model is not attributes");
        this._patches = this._patches.concat(patchAttributes(model, builder).map(_prependPatch(this._idx)));
        return this;
    };
    StaffBuilder.prototype.insertAttributes = function (builder) {
        var li = buildAttributes(builder);
        var p = [this._idx];
        this._patches = this._patches.concat({ li: li, p: p });
        return this;
    };
    StaffBuilder.prototype.direction = function (builder) {
        var model = this._segment[this._idx];
        invariant(model, "no such model");
        invariant(this._document.modelHasType(model, Type.Direction), "model is not direction");
        this._patches = this._patches.concat(patchDirection(model, builder).map(_prependPatch(this._idx)));
        return this;
    };
    StaffBuilder.prototype.insertDirection = function (builder) {
        if (typeof builder === "function") {
            var li_1 = buildDirection(builder);
            var p_1 = [this._idx];
            this._patches = this._patches.concat({ li: li_1, p: p_1 });
            return this;
        }
        var p = [this._idx];
        var li = cloneObject(builder);
        li._class = "Direction";
        this._patches = this._patches.concat({ li: li, p: p });
        return this;
    };
    StaffBuilder.prototype.print = function (builder) {
        var model = this._segment[this._idx];
        invariant(model, "no such model");
        invariant(this._document.modelHasType(model, Type.Print), "model is not Print");
        this._patches = this._patches.concat(patchPrint(model, builder).map(_prependPatch(this._idx)));
        return this;
    };
    StaffBuilder.prototype.insertPrint = function (builder) {
        var li = buildPrint(builder);
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
            ld: this._segment[this._idx],
        });
        return this;
    };
    return StaffBuilder;
}());
export { StaffBuilder };
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
        invariant(model, "no such model");
        invariant(this._document.modelHasType(model, Type.Chord), "model is not a chord");
        var note = model[noteIDX];
        invariant(note, "invalid note");
        this._patches = this._patches.concat(patchNote(note, builder).map(_prependPatch(this._idx, "notes", noteIDX)));
        return this;
    };
    VoiceBuilder.prototype.insertChord = function (builders) {
        invariant(!isNaN(this._idx), "%s must be a number", this._idx);
        var li = builders.map(function (builder) { return buildNote(builder); });
        li._class = "Chord";
        invariant(li[0].noteType.duration, "Invalid note type");
        var p = [this._idx];
        this._patches = this._patches.concat({ li: li, p: p });
        return this;
    };
    VoiceBuilder.prototype.insertNote = function (position, builder) {
        var model = this._segment[this._idx];
        invariant(model, "no such model");
        invariant(this._document.modelHasType(model, Type.Chord), "model is not a chord");
        var li = buildNote(builder);
        var chord = model;
        invariant(chord[position - 1] || chord[position + 1] || !chord.length, "Invalid position for note");
        invariant(li.noteType.duration, "Invalid note type");
        var p = [this._idx, "notes", position];
        this._patches = this._patches.concat({ p: p, li: li });
        return this;
    };
    VoiceBuilder.prototype.remove = function () {
        this._patches = this._patches.concat({
            p: [this._idx],
            ld: this._segment[this._idx],
        });
        return this;
    };
    return VoiceBuilder;
}());
export { VoiceBuilder };
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
        invariant(!this._part || Boolean(voice), "invalid voice");
        this._patches = this._patches.concat(builder(new VoiceBuilder(voice, this._document, idx)).patches.map(_prependPatch("voices", voiceID)));
        return this;
    };
    PartBuilder.prototype.staff = function (staffID, builder, idx) {
        var staff = this._part ? this._part.staves[staffID] : null;
        invariant(!this._part || Boolean(staff), "invalid staff");
        this._patches = this._patches.concat(builder(new StaffBuilder(staff, this._document, idx)).patches.map(_prependPatch("staves", staffID)));
        return this;
    };
    return PartBuilder;
}());
export { PartBuilder };
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
        invariant(!this._measure || Boolean(part), "invalid part id");
        this._patches = this._patches.concat(builder(new PartBuilder(part, this._document)).patches.map(_prependPatch("parts", partID)));
        return this;
    };
    return MeasureBuilder;
}());
export { MeasureBuilder };
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
        var measure = find(this._doc.measures, function (it) { return it.uuid === measureUUID; });
        invariant(Boolean(measure), "invalid measure uuid " + measureUUID);
        this._patches = this._patches.concat(builder(new MeasureBuilder(measure, this._doc)).patches.map(_prependPatch(measureUUID)));
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
        this._patches = this._patches.concat(builder(new MeasureBuilder(null, this._doc)).patches.map(_prependPatch(uuid)));
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
export { DocumentBuilder };
var ModelMetreMutationSpec = /** @class */ (function () {
    function ModelMetreMutationSpec(spec, originalModel) {
        extend(this, spec);
        this._originalModel = originalModel;
    }
    ModelMetreMutationSpec.prototype.toSpec = function () {
        var _this = this;
        if (!this._originalModel) {
            throw new Error("Only valid for mutations!");
        }
        var originalModel = cloneObject(this._originalModel);
        if (originalModel._class === "Chord" || originalModel.length) {
            var chordModel = originalModel;
            forEach(chordModel, function (c) {
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
                    c.dots = times(_this.newDots, function () { return ({}); });
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
export { ModelMetreMutationSpec };
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
        var measure = find(document.measures, function (doc) { return doc.uuid === measureUUID; });
        if (!measure) {
            // TODO: validate blank measures
            return;
        }
        if (patch.p[1] !== "parts") {
            return;
        }
        var part = measure.parts[patch.p[2]];
        invariant(part, "part " + patch.p[2] + " should exist in measure " + measureUUID);
        if (patch.p[3] === "staves") {
            return;
        }
        invariant(patch.p[3] === "voices", "only voices are supported here");
        var voice = part.voices[patch.p[4]];
        invariant(voice, "expected to find voice " + patch.p[4] + " in part " + patch.p[2] + " in measure " + measureUUID);
        var segID = patch.p.slice(0, 5).join("++");
        if (!segments[segID]) {
            segments[segID] = voice;
            var currDiv_1 = 0;
            attributes[segID] = document.search(part.staves[1], 0, Type.Attributes)[0]._snapshot;
            var time_1 = attributes[segID].time; // TODO: TS changes
            var divisions_1 = attributes[segID].divisions;
            elementInfos[segID] = voice.reduce(function (elementInfo, model, idx) {
                if (!document.modelHasType(model, Type.Chord)) {
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
                var divs = calcDivisions(model, { time: time_1, divisions: divisions_1 });
                var theRest = rest(model);
                var info = new ModelMetreMutationSpec({
                    idx: idx,
                    oldIdx: idx,
                    start: currDiv_1,
                    previousDivisions: divs,
                    newDivisions: divs,
                    newCount: count(model),
                    newDots: dots(model),
                    newTimeModification: timeModification(model),
                    time: time_1,
                    rest: !!theRest,
                    forced: theRest && "_force" in theRest,
                    beam: beams(model),
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
                var b = isChord ? beams(patch.li) : null;
                var c = isChord ? count(patch.li) : 0;
                var d = isChord ? dots(patch.li) : 0;
                var tm = isChord ? timeModification(patch.li) : null;
                var theRest = rest(patch.li);
                var divs = isChord
                    ? calcDivisions(patch.li, { time: attributes[segID].time, divisions: divisions })
                    : 0;
                var start = void 0;
                var spliceIdx = parseInt(patch.p[5], 10);
                invariant(isInteger(spliceIdx) && !isNaN(spliceIdx), "Expected an integer");
                if (spliceIdx === 0) {
                    start = 0;
                }
                else {
                    start =
                        elementInfos[segID][spliceIdx - 1].newDivisions +
                            elementInfos[segID][spliceIdx - 1].start;
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
                    forced: theRest && typeof theRest !== "boolean" && "_force" in theRest,
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
                var divs = patch.ld._class === "Chord"
                    ? calcDivisions(patch.ld, {
                        time: attributes[segID].time,
                        divisions: divisions,
                    })
                    : 0;
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
        invariant(el, "expected to find element $" + patch.p[5] + " in part " + patch.p[2] + " in voice " + patch.p[4] + " in measure " + measureUUID);
        if (!document.modelHasType(el, Type.Chord) ||
            patch.p[6] !== "notes" ||
            patch.p[7] !== 0) {
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
        info.newDivisions = calcDivisions({
            count: info.newCount,
            dots: info.newDots,
            timeModification: info.newTimeModification,
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
        elementInfoByChord: elementInfoByChord,
    };
}
function fixMetre(document, patches) {
    patches = patches.slice();
    var attributes;
    var elementInfos;
    var mi = getMutationInfo(document, patches);
    attributes = mi.attributes;
    elementInfos = mi.elementInfos;
    forEach(elementInfos, function (voiceInfo, key) {
        var anyChanged = voiceInfo.some(function (n) { return n.touched; });
        if (!anyChanged) {
            return;
        }
        var restSpecs = simplifyRests(voiceInfo, document, attributes[key]);
        patches = patches.concat(restSpecs.map(function (spec) {
            return extend({}, spec, {
                p: key.split("++").concat(spec.p),
            });
        }));
    });
    return patches;
}
function fixBarlines(_doc, patches) {
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
    invariant(newCursor.length === 1, "Limit 1 cursor operation per patch");
    patches = patches.slice();
    forEach(doc.measures, function (measure) {
        forEach(measure.parts, function (part, partName) {
            forEach(part.voices, function (voice, voiceIDX) {
                if (!voice) {
                    return;
                }
                var segID = [
                    measure.uuid,
                    "parts",
                    partName,
                    "voices",
                    voiceIDX,
                ].join("++");
                var segInfo = elementInfos[segID];
                if (segInfo) {
                    var offset_1 = 0;
                    forEach(segInfo, function (element) {
                        if (!isNaN(element.idx) &&
                            !isNaN(element.oldIdx) &&
                            doc.modelHasType(voice[element.oldIdx], Type.VisualCursor)) {
                            patches.push({
                                p: [
                                    measure.uuid,
                                    "parts",
                                    partName,
                                    "voices",
                                    voiceIDX,
                                    element.idx + offset_1,
                                ],
                                ld: JSON.parse(JSON.stringify(voice[element.oldIdx])),
                            });
                            offset_1 -= 1;
                        }
                    });
                }
                else {
                    var offset_2 = 0;
                    forEach(voice, function (el, idx) {
                        if (doc.modelHasType(el, Type.VisualCursor)) {
                            patches.push({
                                p: [
                                    measure.uuid,
                                    "parts",
                                    partName,
                                    "voices",
                                    voiceIDX,
                                    idx + offset_2,
                                ],
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
    _a[Count.Eighth] = 1,
    _a[Count._16th] = 2,
    _a[Count._32nd] = 3,
    _a[Count._64th] = 4,
    _a[Count._128th] = 5,
    _a[Count._256th] = 6,
    _a[Count._512th] = 7,
    _a);
function addBeams(document, patches) {
    patches = patches.slice();
    var _a = getMutationInfo(document, patches), segments = _a.segments, elementInfos = _a.elementInfos;
    forEach(elementInfos, function (voiceInfo, key) {
        var segment = segments[key];
        var time = voiceInfo[0].time;
        var stdBP = getBeamingPattern(time); // TODO: TS changes in bar
        // const cleanBP = getBeamingPattern(time, "clean");
        // const altBP = getBeamingPattern(time, "alt");
        var beamGroup = [];
        var beamBeams = [];
        var inCandidate = [];
        var beamingPattern = stdBP;
        function applyCandidate() {
            // Remove all rests at the end and beginning.
            var start = findIndex(beamGroup, function (i) { return !voiceInfo[i].rest; });
            var end = findLastIndex(beamGroup, function (i) { return !voiceInfo[i].rest; });
            beamBeams = beamBeams.slice(start, end + 1);
            beamGroup = beamGroup.slice(start, end + 1);
            if (beamGroup.length < 2) {
                return;
            }
            // Mark elements in the candidate
            beamGroup.forEach(function (b) { return (inCandidate[b] = true); });
            if (!some(beamGroup, function (i) { return voiceInfo[i].touched; })) {
                // We did not modify this beam group, so don't change it here.
                return;
            }
            patches = patches.concat(beamGroup.map(function (i, j) {
                var type = null;
                var beams = times(beamBeams[j], function (beamNumber) {
                    if (i === beamGroup[0] || beamBeams[j - 1] < beamNumber + 1) {
                        if (i === last(beamGroup) || beamBeams[j + 1] < beamNumber + 1) {
                            // HACK HACK HACK -- it's more complex than this
                            type = j === 0 ? BeamType.ForwardHook : BeamType.BackwardHook;
                        }
                        else {
                            type = BeamType.Begin;
                        }
                    }
                    else if (i === last(beamGroup) ||
                        beamBeams[j + 1] < beamNumber + 1) {
                        type = BeamType.End;
                    }
                    else {
                        type = BeamType.Continue;
                    }
                    return buildBeam(function (beam) { return beam.number(beamNumber + 1).type(type); });
                });
                var miniP = {
                    p: key.split("++").concat([
                        i,
                        "notes",
                        0,
                        "beams",
                    ]),
                    oi: beams,
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
                var next = calcDivisions(beamingPattern[bpIDX], {
                    time: time,
                    divisions: segment.divisions,
                });
                divisionsInCurrentBucket += next;
            }
        }
        advanceBP(0);
        voiceInfo.forEach(function (elInfo, originalIdx) {
            if (!elInfo.newDivisions) {
                // Skip this non-note.
                return;
            }
            var divs = calcDivisions({
                count: elInfo.newCount,
                dots: elInfo.newDots,
            }, {
                time: time,
                divisions: segment.divisions,
            }, true);
            var isCandidate = countToIsBeamable[elInfo.newCount] &&
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
                    p: key.split("++").concat([
                        i,
                        "notes",
                        0,
                        "beams",
                    ]),
                    od: elInfo.beam,
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
export default function createPatch(isPreview, document, builderOrMeasure, part, partBuilder) {
    var patches;
    if (builderOrMeasure instanceof Array) {
        patches = cleanupPatches(document, builderOrMeasure);
    }
    else if (typeof builderOrMeasure === "function") {
        invariant(part === undefined && partBuilder === undefined, "createPatch: invalid usage");
        var builder = builderOrMeasure;
        patches = builder(new DocumentBuilder(document)).patches;
        if (!isPreview) {
            patches = cleanupPatches(document, patches);
        }
    }
    else {
        var measure_1 = builderOrMeasure;
        var builder_1 = partBuilder;
        patches = createPatch(isPreview, document, function (document) {
            return document.measure(measure_1, function (measure) { return measure.part(part, builder_1); });
        });
    }
    return patches;
}
//# sourceMappingURL=engine_createPatch.js.map