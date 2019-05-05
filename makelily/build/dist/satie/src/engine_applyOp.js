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
var invariant_1 = __importDefault(require("invariant"));
var lodash_1 = require("lodash");
var document_1 = require("./document");
var engine_divisions_1 = require("./engine_divisions");
var private_util_1 = require("./private_util");
var private_mutate_1 = require("./private_mutate");
var implAttributes_attributesMutator_1 = __importDefault(require("./implAttributes_attributesMutator"));
var implBarline_barlineMutator_1 = __importDefault(require("./implBarline_barlineMutator"));
var implChord_chordMutator_1 = __importDefault(require("./implChord_chordMutator"));
var implPrint_printMutator_1 = __importDefault(require("./implPrint_printMutator"));
var implSegment_segmentMutator_1 = __importDefault(require("./implSegment_segmentMutator"));
/**
 * Checks whether this object is safe to JSON.stringify and JSON.parse.
 * The only difference between the two should be presence of undefined values in Arrays and Objects.
 * In Objects that previously had undefined values, after serializing, these keys will be removed.
 * In Arrays that previously had undefined values, after serializing, these values will be replaced with null.
 */
function isSerializable(obj) {
    if (lodash_1.isUndefined(obj) ||
        lodash_1.isNull(obj) ||
        lodash_1.isBoolean(obj) ||
        lodash_1.isNumber(obj) ||
        lodash_1.isString(obj)) {
        return true;
    }
    else if (lodash_1.isArray(obj)) {
        return obj.every(isSerializable);
    }
    else if (lodash_1.isPlainObject(obj)) {
        return Object.keys(obj).every(function (key) { return isSerializable(obj[key]); });
    }
    return false;
}
/**
 * Applies an operation to the given set of measures, usually part of a document.
 *
 * CAREFUL: Does not touch `appliedOperations` because this function can also be used for undo. It's
 * the caller's responsibility to update `appliedOperations`.
 *
 * @param op.p [measureUUID, ("part"|"voice")]
 */
function applyOp(preview, measures, factory, op, document, notEligableForPreview) {
    // Operations must be entirely serializable, to be sent over the work. Serializble means it is one of:
    //   - a simple data type (number, string, ...)
    //   - a plain object (object with prototype Object), and that the same is true for all children
    //   - a plain array, and that the same is true for all items
    invariant_1.default(isSerializable(op), "All operations must be serializable.");
    var path = op.p;
    if (path.length === 2 && path[0] === "measures") {
        // Song-wide measure addition/removal
        var localOp = {
            p: op.p.slice(1),
            ld: op.ld,
            li: op.li,
        };
        applyMeasureOp(measures, factory, localOp, document);
        return;
    }
    else if (path.length === 1 && path[0] === "divisions") {
        var segments_1 = [];
        measures.forEach(function (measure) {
            Object.keys(measure.parts).forEach(function (partName) {
                var part = measure.parts[partName];
                part.staves.concat(part.voices).forEach(function (segment) {
                    if (segment) {
                        segments_1.push(segment);
                    }
                });
            });
            engine_divisions_1.normalizeDivisionsInPlace(factory, segments_1, op.oi);
        });
        return;
    }
    var measureUUID = parseInt(String(path[0]), 10);
    var measure = lodash_1.find(measures, function (measure) { return measure.uuid === measureUUID; });
    invariant_1.default(Boolean(measure), "Invalid operation path: no such measure " + path[0]);
    invariant_1.default(path[1] === "parts", "Invalid operation path: only parts is supported, not " + path[1]);
    var part = measure.parts[path[2]];
    invariant_1.default(Boolean(part), "Invalid operation path: no such part " + part);
    ++measure.version;
    invariant_1.default(path[3] === "voices" || path[3] === "staves", "Invalid operation path: " + path[3] + " should have been \"voices\" or \"staves");
    var cleanliness = document.cleanlinessTracking.measures[measureUUID];
    if (cleanliness) {
        cleanliness.clean = null;
    }
    if (path[3] === "voices") {
        var voice = part.voices[parseInt(String(path[4]), 10)];
        invariant_1.default(Boolean(voice), "Invalid operation path: No such voice " + path.slice(0, 4).join(", "));
        if (path.length === 6 && ((op.li && !op.ld) || (!op.li && op.ld))) {
            notEligableForPreview();
            implSegment_segmentMutator_1.default(factory, voice, op, document);
            return;
        }
        var element = voice[parseInt(String(path[5]), 10)];
        invariant_1.default(Boolean(element), "Invalid operation path: No such element " + path.slice(0, 5).join(", "));
        var localOp = lodash_1.cloneDeep(op);
        localOp.p = path.slice(6);
        if (factory.modelHasType(element, document_1.Type.Chord)) {
            implChord_chordMutator_1.default(element, localOp);
        }
        else {
            throw new Error("Invalid operation path: No voice reducer for " + element);
        }
    }
    else if (path[3] === "staves") {
        var staff = part.staves[parseInt(String(path[4]), 10)];
        invariant_1.default(Boolean(staff), "Invalid operation path: No such staff " + path.slice(0, 4).join(", "));
        if (path.length === 6 && ((op.li && !op.ld) || (!op.li && op.ld))) {
            notEligableForPreview();
            implSegment_segmentMutator_1.default(factory, staff, op, document);
            return;
        }
        var element = staff[parseInt(String(path[5]), 10)];
        invariant_1.default(Boolean(element), "Invalid operation path: No such element " + path.slice(0, 5).join(", "));
        var localOp = lodash_1.cloneDeep(op);
        localOp.p = path.slice(6);
        if (factory.modelHasType(element, document_1.Type.Barline)) {
            implBarline_barlineMutator_1.default(element, localOp);
        }
        else if (factory.modelHasType(element, document_1.Type.Attributes)) {
            if (!preview) {
                // Mark everything as dirty -- this is overkill, but finding what measures
                // need to be changed is tough.
                var ctMeasures_1 = document.cleanlinessTracking.measures;
                Object.keys(ctMeasures_1).forEach(function (measureName) {
                    if (ctMeasures_1[measureName]) {
                        ctMeasures_1[measureName].clean = null;
                    }
                });
            }
            implAttributes_attributesMutator_1.default(preview, element, localOp);
        }
        else if (factory.modelHasType(element, document_1.Type.Print)) {
            implPrint_printMutator_1.default(preview, element, localOp);
        }
        else if (factory.modelHasType(element, document_1.Type.Spacer)) {
            private_mutate_1.mutate(element, localOp);
        }
        else {
            throw new Error("Invalid operation path: No staff reducer for " + element);
        }
    }
}
exports.default = applyOp;
function applyMeasureOp(measures, factory, op, doc) {
    var ok = false;
    var oldMeasure;
    if (op.ld !== undefined && op.p.length === 1) {
        ok = true;
        var measureIdx = op.p[0];
        invariant_1.default(!isNaN(measureIdx), "Measure index " + measureIdx + " must be");
        invariant_1.default(Boolean(op.ld.uuid), "uuid must be specified");
        invariant_1.default(op.ld.uuid === measures[measureIdx].uuid, "invalid uuid " + op.ld.uuid + " != " + measures[measureIdx].uuid);
        oldMeasure = measures[measureIdx];
        measures.splice(measureIdx, 1);
        measures.slice(measureIdx).forEach(function (measure) {
            ++measure.version;
            --measure.idx;
            if (!isNaN(parseInt(measure.number, 10))) {
                measure.number = String(parseInt(measure.number, 10) - 1);
            }
            else {
                console.warn("Cannot change bar number for invalid measure number ", measure.number);
            }
        });
    }
    if (op.li !== undefined && op.p.length === 1) {
        ok = true;
        var measureIdx = op.p[0];
        invariant_1.default(!isNaN(measureIdx), "Measure index " + measureIdx + " must be");
        invariant_1.default(Boolean(op.li.uuid), "uuid must be specified");
        oldMeasure =
            oldMeasure || measures[measureIdx - 1] || measures[measureIdx + 1]; // note, we don't support empty docs
        var oldParts = oldMeasure.parts;
        var newParts_1 = private_util_1.cloneObject(op.li.parts) || {};
        lodash_1.forEach(oldParts, function (part, partID) {
            newParts_1[partID] = newParts_1[partID] || {
                voices: [],
                staves: [],
            };
            lodash_1.forEach(part.staves, function (staff, staffIdx) {
                if (!staff) {
                    newParts_1[partID].staves[staffIdx] =
                        newParts_1[partID].staves[staffIdx] || null;
                }
                else {
                    if (newParts_1[partID].staves[staffIdx]) {
                        newParts_1[partID].staves[staffIdx] =
                            newParts_1[partID].staves[staffIdx].map(function (i) { return factory.fromSpec(i); }) ||
                                [];
                    }
                    else {
                        newParts_1[partID].staves[staffIdx] = [];
                    }
                    var nv = newParts_1[partID].staves[staffIdx];
                    nv.divisions = staff.divisions;
                    nv.part = staff.part;
                    nv.owner = staff.owner;
                    nv.ownerType = staff.ownerType;
                }
            });
            lodash_1.forEach(part.voices, function (voice, voiceIdx) {
                if (!voice) {
                    newParts_1[partID].voices[voiceIdx] =
                        newParts_1[partID].voices[voiceIdx] || null;
                }
                else {
                    if (newParts_1[partID].voices[voiceIdx]) {
                        newParts_1[partID].voices[voiceIdx] =
                            newParts_1[partID].voices[voiceIdx].map(function (i) {
                                var model = factory.fromSpec(i);
                                if (doc.modelHasType(model, document_1.Type.VisualCursor)) {
                                    doc._visualCursor = model;
                                }
                                return model;
                            }) || [];
                    }
                    else {
                        newParts_1[partID].voices[voiceIdx] = [];
                    }
                    var nv = newParts_1[partID].voices[voiceIdx];
                    nv.divisions = voice.divisions;
                    nv.part = voice.part;
                    nv.owner = voice.owner;
                    nv.ownerType = voice.ownerType;
                }
            });
        });
        var newMeasure = {
            idx: measureIdx,
            uuid: op.li.uuid,
            number: "" + (measureIdx + 1),
            implicit: false,
            width: NaN,
            nonControlling: false,
            parts: newParts_1,
            version: 0,
        };
        oldMeasure.parts = oldParts;
        measures.splice(measureIdx, 0, newMeasure);
        measures.slice(measureIdx + 1).forEach(function (measure) {
            ++measure.idx;
            ++measure.version;
            if (!isNaN(parseInt(measure.number, 10))) {
                measure.number = String(parseInt(measure.number, 10) + 1);
            }
            else {
                console.warn("Cannot change bar number for invalid measure number ", measure.number);
            }
        });
        measures.forEach(function (measure) { return ++measure.version; });
    }
    invariant_1.default(ok, "Invalid operation type for applyMeasureOp's context: " + JSON.stringify(op));
}
exports.applyMeasureOp = applyMeasureOp;
//# sourceMappingURL=engine_applyOp.js.map