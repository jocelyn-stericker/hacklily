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
/**
 * @file models/musicxml/import.ts tools for converting MXMLJSON to SatieJSON
 */
var musicxml_interfaces_1 = require("musicxml-interfaces");
var builders_1 = require("musicxml-interfaces/builders");
var lodash_1 = require("lodash");
var invariant = require("invariant");
var document_1 = require("./document");
var document_2 = require("./document");
var private_util_1 = require("./private_util");
var private_chordUtil_1 = require("./private_chordUtil");
var private_part_1 = require("./private_part");
var private_util_2 = require("./private_util");
var private_fontManager_1 = require("./private_fontManager");
var engine_processors_validate_1 = require("./engine_processors_validate");
var engine_scoreHeader_1 = require("./engine_scoreHeader");
var engine_setup_1 = require("./engine_setup");
/*---- Exports ----------------------------------------------------------------------------------*/
function stringToDocument(src, factory) {
    var mxmljson = musicxml_interfaces_1.parseScore(src);
    if (mxmljson.error) {
        throw mxmljson.error;
    }
    var document = timewiseStructToDocument(mxmljson, factory);
    if (document.error) {
        throw document.error;
    }
    var contextOptions = {
        attributes: null,
        document: document,
        fixup: null,
        header: document.header,
        lineCount: NaN,
        lineIndex: NaN,
        measures: document.measures,
        modelFactory: factory,
        postprocessors: [],
        preprocessors: factory.preprocessors,
        preview: false,
        print: null,
        singleLineMode: false,
    };
    engine_processors_validate_1.default(contextOptions);
    engine_scoreHeader_1.default.prototype.overwriteEncoding.call(document.header);
    return document;
}
exports.stringToDocument = stringToDocument;
/**
 * Converts a timewise MXMLJSON score to an uninitialized Satie score.
 * See also Models.importXML.
 *
 * @param score produced by github.com/jnetterf/musicxml-interfaces
 * @returns A structure that can be consumed by a score. If an error occurred
 *          error will be set, and all other properties will be null.
 */
function timewiseStructToDocument(score, factory) {
    try {
        var header = _extractMXMLHeader(score);
        var partData = _extractMXMLPartsAndMeasures(score, factory);
        if (partData.error) {
            return new document_1.Document(null, null, null, null, new Error(partData.error));
        }
        return new document_1.Document(header, partData.measures, partData.parts, factory);
    }
    catch (error) {
        return new document_1.Document(null, null, null, null, error);
    }
}
exports.timewiseStructToDocument = timewiseStructToDocument;
/*---- Private ----------------------------------------------------------------------------------*/
function _extractMXMLHeader(m) {
    var header = new engine_scoreHeader_1.default({
        credits: m.credits,
        defaults: m.defaults,
        identification: m.identification,
        movementNumber: m.movementNumber,
        movementTitle: m.movementTitle,
        partList: m.partList,
        work: m.work
    });
    // Add credits to help exporters don't record credits, but do record movementTitle.
    if ((!header.credits || !header.credits.length) && header.movementTitle) {
        header.title = header.movementTitle;
    }
    return header;
}
exports._extractMXMLHeader = _extractMXMLHeader;
function _extractMXMLPartsAndMeasures(input, factory) {
    var parts = lodash_1.map(private_part_1.scoreParts(input.partList), function (inPart) { return inPart.id; });
    var createModel = factory.create.bind(factory);
    // TODO/STOPSHIP - sync division count in each measure
    var divisions = 768; // XXX: LilyPond-regression 41g.xml does not specify divisions
    var gStaves = 0;
    var chordBeingBuilt = null;
    var lastAttribs = null;
    var maxVoice = 0;
    var measures = lodash_1.map(input.measures, function (inMeasure, measureIdx) {
        var measure = {
            idx: measureIdx,
            implicit: inMeasure.implicit,
            nonControlling: inMeasure.nonControlling,
            number: inMeasure.number,
            parts: {},
            uuid: Math.floor(Math.random() * private_util_1.MAX_SAFE_INTEGER),
            width: inMeasure.width,
            version: 0
        };
        if (Object.keys(inMeasure.parts).length === 1 && "" in inMeasure.parts) {
            // See LilyPond-regression >> 41g.
            inMeasure.parts[parts[0]] = inMeasure.parts[""];
            delete inMeasure.parts[""];
        }
        var linkedParts = lodash_1.map(inMeasure.parts, function (val, key) {
            if (!lodash_1.some(parts, function (part) { return part === key; })) {
                // See LilyPond-regression >> 41h.
                return null;
            }
            var output = {
                staves: [],
                voices: []
            };
            invariant(!(key in measure.parts), "Duplicate part ID %s", key);
            measure.parts[key] = output;
            invariant(!!key, "Part ID must be defined");
            return {
                division: 0,
                divisionPerStaff: [],
                divisionPerVoice: [],
                id: key,
                idx: 0,
                input: val,
                lastNote: null,
                output: output,
                times: [{
                        beatTypes: [4],
                        beats: ["4"]
                    }]
            };
        });
        linkedParts = lodash_1.filter(linkedParts, function (p) { return !!p; });
        var commonDivisions = lodash_1.reduce(linkedParts, function (memo, part) {
            return lodash_1.reduce(part.input, function (memo, input) {
                if (input._class === "Attributes" && input.divisions) {
                    return private_util_2.lcm(memo, input.divisions);
                }
                return memo;
            }, memo);
        }, divisions);
        // Lets normalize divisions here.
        lodash_1.forEach(linkedParts, function (part) {
            var previousDivisions = divisions;
            lodash_1.forEach(part.input, function (input) {
                if (input.divisions) {
                    previousDivisions = input.divisions;
                    input.divisions = commonDivisions;
                }
                if (input.count) {
                    input.count *= commonDivisions / previousDivisions;
                }
                if (input.duration) {
                    input.duration *= commonDivisions / previousDivisions;
                }
            });
        });
        var target = linkedParts[0];
        var _loop_1 = function () {
            // target is accessed outside loop in syncStaffDivisions
            target = lodash_1.minBy(linkedParts, function (part) { return part.idx === part.input.length ?
                private_util_1.MAX_SAFE_INTEGER : part.division; });
            invariant(!!target, "Target not specified");
            var input_1 = target.input[target.idx];
            var prevStaff = 1;
            switch (input_1._class) {
                case "Note":
                    var note = input_1;
                    // TODO: is this the case even if voice/staff don't match up?
                    if (!!note.chord) {
                        invariant(!!chordBeingBuilt, "Cannot add chord to a previous note without a chord");
                        chordBeingBuilt.push(note);
                    }
                    else {
                        // Notes go in the voice context.
                        var voice = note.voice || 1;
                        var staff_1 = note.staff || 1;
                        prevStaff = staff_1;
                        if (!(voice in target.output.voices)) {
                            createVoice(voice, target.output);
                            maxVoice = Math.max(voice, maxVoice);
                        }
                        // Make sure there is a staff segment reserved for the given staff
                        if (!(staff_1 in target.output.staves)) {
                            createStaff(staff_1, target.output);
                        }
                        // Check target voice division and add spacing if needed
                        target.divisionPerVoice[voice] = target.divisionPerVoice[voice] || 0;
                        invariant(target.division >= target.divisionPerVoice[voice], "Ambiguous voice timing: all voices must be monotonic.");
                        if (target.divisionPerVoice[voice] < target.division) {
                            // Add rest
                            var divisionsInVoice = target.divisionPerVoice[voice];
                            // This beautiful IIFE is needed because of undefined behaviour for
                            // block-scoped variables in modules.
                            var restModel = (function (divisionsInVoice) {
                                return factory.fromSpec(builders_1.buildNote(function (note) { return note
                                    .printObject(false)
                                    .rest({})
                                    .duration(target.division - divisionsInVoice); }));
                            })(divisionsInVoice);
                            var division = target.divisionPerVoice[voice];
                            restModel[0].duration = target.division - division;
                            target.output.voices[voice].push(restModel);
                            target.divisionPerVoice[voice] = target.division;
                        }
                        // Add the note to the voice segment and register it as the
                        // last inserted note
                        var newNote = factory.fromSpec(input_1);
                        target.output.voices[voice].push(newNote);
                        chordBeingBuilt = newNote;
                        // Update target division
                        var divs = void 0;
                        try {
                            divs = private_chordUtil_1.divisions([input_1], {
                                time: target.times[0],
                                divisions: divisions
                            });
                        }
                        catch (err) {
                            console.warn("Guessing count from duration");
                            divs = input_1.duration;
                        }
                        target.divisionPerVoice[voice] += divs;
                        target.division += divs;
                    }
                    break;
                case "Attributes":
                case "Barline":
                case "Direction":
                case "FiguredBass":
                case "Grouping":
                case "Harmony":
                case "Print":
                case "Sound":
                    var staff = input_1._class === "Harmony" && !input_1.staff ? prevStaff :
                        input_1.staff || 1; // Explodes to all staves at a later point.
                    prevStaff = staff;
                    if (!(staff in target.output.staves)) {
                        target.output.staves[staff] = [];
                        target.output.staves[staff].owner = staff;
                        target.output.staves[staff].ownerType = "staff";
                    }
                    var newModel = factory.fromSpec(input_1);
                    // Check if this is metadata:
                    if (input_1._class === "Direction") {
                        var direction = newModel;
                        var words = direction.directionTypes.length === 1 && direction.directionTypes[0].words;
                        if (words && words.length === 1) {
                            var maybeMeta = words[0].data.trim();
                            if (lodash_1.startsWith(maybeMeta, "SATIE_SONG_META = ") && lodash_1.endsWith(maybeMeta, ";")) {
                                // let songMeta = JSON.parse(maybeMeta.replace(/^SATIE_SONG_META = /, "").replace(/;$/, ""));
                                break; // Do not actually import as direction
                            }
                            else if (lodash_1.startsWith(maybeMeta, "SATIE_MEASURE_META = ") && lodash_1.endsWith(maybeMeta, ";")) {
                                var measureMeta = JSON.parse(maybeMeta.replace(/^SATIE_MEASURE_META = /, "").replace(/;$/, ""));
                                measure.uuid = measureMeta.uuid;
                                break; // Do not actually import as direction
                            }
                        }
                    }
                    syncAppendStaff(staff, newModel, input_1.divisions || divisions);
                    if (input_1._class === "Attributes") {
                        lastAttribs = input_1;
                        divisions = lastAttribs.divisions || divisions;
                        var oTimes = lastAttribs.times;
                        if (oTimes && oTimes.length) {
                            target.times = oTimes;
                        }
                        var staves = lastAttribs.staves || 1;
                        gStaves = staves;
                        lodash_1.times(staves, function (staffMinusOne) {
                            var staff = staffMinusOne + 1;
                            if (!(staff in target.output.staves)) {
                                createStaff(staff, target.output);
                            }
                        });
                    }
                    break;
                case "Forward":
                    var forward = input_1;
                    lodash_1.forEach(target.output.staves, function (staff, staffIdx) {
                        syncAppendStaff(staffIdx, null, input_1.divisions || divisions);
                    });
                    target.division += forward.duration;
                    break;
                case "Backup":
                    var backup = input_1;
                    lodash_1.forEach(target.output.staves, function (staff, staffIdx) {
                        syncAppendStaff(staffIdx, null, input_1.divisions || divisions);
                    });
                    target.division -= backup.duration;
                    break;
                default:
                    throw new Error("Unknown type " + input_1._class);
            }
            ++target.idx;
        };
        // Create base structure
        while (!done()) {
            _loop_1();
        }
        // Finish up
        lodash_1.times(gStaves, function (staffMinusOne) {
            var staff = staffMinusOne + 1;
            if (!(staff in target.output.staves)) {
                createStaff(staff, target.output);
                maxVoice++;
                var voice = createVoice(maxVoice, target.output);
                var newNote = factory.create(document_2.Type.Chord);
                newNote.push({
                    duration: private_chordUtil_1.barDivisionsDI(lastAttribs.times[0], lastAttribs.divisions),
                    rest: {},
                    staff: staff,
                    voice: maxVoice
                });
                voice.push(newNote);
            }
        });
        lodash_1.forEach(linkedParts, function (part) {
            // Note: target is 'var'-scoped!
            target = part;
            // Set divCounts of final elements in staff segments and divisions of all segments
            lodash_1.forEach(target.output.staves, function (staff, staffIdx) {
                syncAppendStaff(staffIdx, null, divisions);
                var segment = target.output.staves[staffIdx];
                if (segment) {
                    segment.divisions = divisions;
                }
            });
            lodash_1.forEach(target.output.voices, function (voice, voiceIdx) {
                var segment = target.output.voices[voiceIdx];
                if (segment) {
                    segment.divisions = divisions;
                }
            });
        });
        function syncAppendStaff(staff, model, localDivisions) {
            var ratio = localDivisions / divisions || 1;
            var divCount = ratio * (target.division - (target.divisionPerStaff[staff] || 0));
            var segment = target.output.staves[staff];
            invariant(!!model && !!segment || !model, "Unknown staff %s");
            if (divCount > 0) {
                if (segment) {
                    if (segment.length) {
                        var model_1 = segment[segment.length - 1];
                        model_1.divCount = model_1.divCount || 0;
                        model_1.divCount += divCount;
                    }
                    else {
                        var model_2 = createModel(document_2.Type.Spacer, {
                            divCount: divCount,
                            staff: staff
                        });
                        segment.push(model_2);
                    }
                }
                target.divisionPerStaff[staff] = target.division;
            }
            if (model) {
                if (divCount >= 0 || !divCount) {
                    segment.push(model);
                }
                else {
                    var offset = divCount;
                    var spliced = false;
                    for (var i = segment.length - 1; i >= 0; --i) {
                        offset += segment[i].divCount;
                        if (offset >= 0) {
                            model.divCount = segment[i].divCount - offset;
                            invariant(isFinite(model.divCount), "Invalid loaded divCount");
                            segment[i].divCount = offset;
                            segment.splice(i + 1, 0, model);
                            spliced = true;
                            break;
                        }
                    }
                    invariant(spliced, "Could not insert %s", model);
                }
            }
        }
        function done() {
            return lodash_1.every(linkedParts, function (part) {
                return part.idx === part.input.length;
            });
        }
        return measure;
    });
    return {
        measures: measures,
        parts: parts
    };
}
exports._extractMXMLPartsAndMeasures = _extractMXMLPartsAndMeasures;
function createVoice(voice, output) {
    output.voices[voice] = [];
    output.voices[voice].owner = voice;
    output.voices[voice].ownerType = "voice";
    return output.voices[voice];
}
function createStaff(staff, output) {
    output.staves[staff] = [];
    output.staves[staff].owner = staff;
    output.staves[staff].ownerType = "staff";
    return output.staves[staff];
}
/**
 * Parses a MusicXML document and returns a Document.
 */
function importXML(src, cb) {
    private_fontManager_1.requireFont("Bravura", "root://bravura/otf/Bravura.otf");
    private_fontManager_1.requireFont("Alegreya", "root://alegreya/Alegreya-Regular.ttf");
    private_fontManager_1.requireFont("Alegreya", "root://alegreya/Alegreya-Bold.ttf", "bold");
    private_fontManager_1.whenReady(function (err) {
        if (err) {
            cb(err);
        }
        else {
            try {
                var factory = engine_setup_1.makeFactory();
                cb(null, stringToDocument(src, factory), factory);
            }
            catch (err) {
                cb(err);
            }
        }
    });
}
exports.importXML = importXML;
//# sourceMappingURL=engine_import.js.map