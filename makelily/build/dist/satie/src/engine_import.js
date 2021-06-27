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
/**
 * @file models/musicxml/import.ts tools for converting MXMLJSON to SatieJSON
 */
import { parseScore, } from "musicxml-interfaces";
import { buildNote } from "musicxml-interfaces/builders";
import { map, reduce, some, filter, minBy, times, every, forEach, startsWith, endsWith, } from "lodash";
import invariant from "invariant";
import { Document } from "./document";
import { Type } from "./document";
import { MAX_SAFE_INTEGER } from "./private_util";
import { barDivisionsDI, divisions as calcDivisions, } from "./private_chordUtil";
import { scoreParts } from "./private_part";
import { lcm } from "./private_util";
import { requireFont, whenReady } from "./private_fontManager";
import validate from "./engine_processors_validate";
import ScoreHeader from "./engine_scoreHeader";
import { makeFactory } from "./engine_setup";
/*---- Exports ----------------------------------------------------------------------------------*/
export function stringToDocument(src, factory) {
    var mxmljson = parseScore(src);
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
    validate(contextOptions);
    ScoreHeader.prototype.overwriteEncoding.call(document.header);
    return document;
}
/**
 * Converts a timewise MXMLJSON score to an uninitialized Satie score.
 * See also Models.importXML.
 *
 * @param score produced by github.com/emilyskidsister/musicxml-interfaces
 * @returns A structure that can be consumed by a score. If an error occurred
 *          error will be set, and all other properties will be null.
 */
export function timewiseStructToDocument(score, factory) {
    try {
        var header = _extractMXMLHeader(score);
        var partData = _extractMXMLPartsAndMeasures(score, factory);
        if (partData.error) {
            return new Document(null, null, null, null, new Error(partData.error));
        }
        return new Document(header, partData.measures, partData.parts, factory);
    }
    catch (error) {
        return new Document(null, null, null, null, error);
    }
}
/*---- Private ----------------------------------------------------------------------------------*/
export function _extractMXMLHeader(m) {
    var header = new ScoreHeader({
        credits: m.credits,
        defaults: m.defaults,
        identification: m.identification,
        movementNumber: m.movementNumber,
        movementTitle: m.movementTitle,
        partList: m.partList,
        work: m.work,
    });
    // Add credits to help exporters don't record credits, but do record movementTitle.
    if ((!header.credits || !header.credits.length) && header.movementTitle) {
        header.title = header.movementTitle;
    }
    return header;
}
export function _extractMXMLPartsAndMeasures(input, factory) {
    var parts = map(scoreParts(input.partList), function (inPart) { return inPart.id; });
    var createModel = factory.create.bind(factory);
    // TODO/STOPSHIP - sync division count in each measure
    var divisions = 768; // XXX: LilyPond-regression 41g.xml does not specify divisions
    var gStaves = 0;
    var chordBeingBuilt = null;
    var lastAttribs = null;
    var maxVoice = 0;
    var measures = map(input.measures, function (inMeasure, measureIdx) {
        var measure = {
            idx: measureIdx,
            implicit: inMeasure.implicit,
            nonControlling: inMeasure.nonControlling,
            number: inMeasure.number,
            parts: {},
            uuid: Math.floor(Math.random() * MAX_SAFE_INTEGER),
            width: inMeasure.width,
            version: 0,
        };
        if (Object.keys(inMeasure.parts).length === 1 && "" in inMeasure.parts) {
            // See LilyPond-regression >> 41g.
            inMeasure.parts[parts[0]] = inMeasure.parts[""];
            delete inMeasure.parts[""];
        }
        var linkedParts = map(inMeasure.parts, function (val, key) {
            if (!some(parts, function (part) { return part === key; })) {
                // See LilyPond-regression >> 41h.
                return null;
            }
            var output = {
                staves: [],
                voices: [],
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
                times: [
                    {
                        beatTypes: [4],
                        beats: ["4"],
                    },
                ],
            };
        });
        linkedParts = filter(linkedParts, function (p) { return !!p; });
        var commonDivisions = reduce(linkedParts, function (memo, part) {
            return reduce(part.input, function (memo, input) {
                if (input._class === "Attributes" && input.divisions) {
                    return lcm(memo, input.divisions);
                }
                return memo;
            }, memo);
        }, divisions);
        // Lets normalize divisions here.
        forEach(linkedParts, function (part) {
            var previousDivisions = divisions;
            forEach(part.input, function (input) {
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
            target = minBy(linkedParts, function (part) {
                return part.idx === part.input.length ? MAX_SAFE_INTEGER : part.division;
            });
            invariant(!!target, "Target not specified");
            var input_1 = target.input[target.idx];
            var prevStaff = 1;
            switch (input_1._class) {
                case "Note":
                    {
                        var note = input_1;
                        // TODO: is this the case even if voice/staff don't match up?
                        if (note.chord) {
                            invariant(!!chordBeingBuilt, "Cannot add chord to a previous note without a chord");
                            chordBeingBuilt.push(note);
                        }
                        else {
                            // Notes go in the voice context.
                            var voice = note.voice || 1;
                            var staff = note.staff || 1;
                            prevStaff = staff;
                            if (!(voice in target.output.voices)) {
                                createVoice(voice, target.output);
                                maxVoice = Math.max(voice, maxVoice);
                            }
                            // Make sure there is a staff segment reserved for the given staff
                            if (!(staff in target.output.staves)) {
                                createStaff(staff, target.output);
                            }
                            // Check target voice division and add spacing if needed
                            target.divisionPerVoice[voice] =
                                target.divisionPerVoice[voice] || 0;
                            invariant(target.division >= target.divisionPerVoice[voice], "Ambiguous voice timing: all voices must be monotonic.");
                            if (target.divisionPerVoice[voice] < target.division) {
                                // Add rest
                                var divisionsInVoice = target.divisionPerVoice[voice];
                                // This beautiful IIFE is needed because of undefined behaviour for
                                // block-scoped variables in modules.
                                var restModel = (function (divisionsInVoice) {
                                    return factory.fromSpec(buildNote(function (note) {
                                        return note
                                            .printObject(false)
                                            .rest({})
                                            .duration(target.division - divisionsInVoice);
                                    }));
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
                                divs = calcDivisions([input_1], {
                                    time: target.times[0],
                                    divisions: divisions,
                                });
                            }
                            catch (err) {
                                console.warn("Guessing count from duration");
                                divs = input_1.duration;
                            }
                            target.divisionPerVoice[voice] += divs;
                            target.division += divs;
                        }
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
                    {
                        var staff = input_1._class === "Harmony" && !input_1.staff
                            ? prevStaff
                            : input_1.staff || 1; // Explodes to all staves at a later point.
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
                            var words = direction.directionTypes.length === 1 &&
                                direction.directionTypes[0].words;
                            if (words && words.length === 1) {
                                var maybeMeta = words[0].data.trim();
                                if (startsWith(maybeMeta, "SATIE_SONG_META = ") &&
                                    endsWith(maybeMeta, ";")) {
                                    // let songMeta = JSON.parse(maybeMeta.replace(/^SATIE_SONG_META = /, "").replace(/;$/, ""));
                                    break; // Do not actually import as direction
                                }
                                else if (startsWith(maybeMeta, "SATIE_MEASURE_META = ") &&
                                    endsWith(maybeMeta, ";")) {
                                    var measureMeta = JSON.parse(maybeMeta
                                        .replace(/^SATIE_MEASURE_META = /, "")
                                        .replace(/;$/, ""));
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
                            times(staves, function (staffMinusOne) {
                                var staff = staffMinusOne + 1;
                                if (!(staff in target.output.staves)) {
                                    createStaff(staff, target.output);
                                }
                            });
                        }
                    }
                    break;
                case "Forward":
                    {
                        var forward = input_1;
                        forEach(target.output.staves, function (_staff, staffIdx) {
                            syncAppendStaff(staffIdx, null, input_1.divisions || divisions);
                        });
                        target.division += forward.duration;
                    }
                    break;
                case "Backup":
                    {
                        var backup = input_1;
                        forEach(target.output.staves, function (_staff, staffIdx) {
                            syncAppendStaff(staffIdx, null, input_1.divisions || divisions);
                        });
                        target.division -= backup.duration;
                    }
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
        times(gStaves, function (staffMinusOne) {
            var staff = staffMinusOne + 1;
            if (!(staff in target.output.staves)) {
                createStaff(staff, target.output);
                maxVoice++;
                var voice = createVoice(maxVoice, target.output);
                var newNote = factory.create(Type.Chord);
                newNote.push({
                    duration: barDivisionsDI(lastAttribs.times[0], lastAttribs.divisions),
                    rest: {},
                    staff: staff,
                    voice: maxVoice,
                });
                voice.push(newNote);
            }
        });
        forEach(linkedParts, function (part) {
            // Note: target is 'var'-scoped!
            target = part;
            // Set divCounts of final elements in staff segments and divisions of all segments
            forEach(target.output.staves, function (_staff, staffIdx) {
                syncAppendStaff(staffIdx, null, divisions);
                var segment = target.output.staves[staffIdx];
                if (segment) {
                    segment.divisions = divisions;
                }
            });
            forEach(target.output.voices, function (_voice, voiceIdx) {
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
            invariant((!!model && !!segment) || !model, "Unknown staff %s");
            if (divCount > 0) {
                if (segment) {
                    if (segment.length) {
                        var model_1 = segment[segment.length - 1];
                        model_1.divCount = model_1.divCount || 0;
                        model_1.divCount += divCount;
                    }
                    else {
                        var model_2 = createModel(Type.Spacer, {
                            divCount: divCount,
                            staff: staff,
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
            return every(linkedParts, function (part) {
                return part.idx === part.input.length;
            });
        }
        return measure;
    });
    return {
        measures: measures,
        parts: parts,
    };
}
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
export function importXML(src, cb) {
    requireFont("Bravura", "root://bravura/otf/Bravura.otf");
    requireFont("Alegreya", "root://alegreya/Alegreya-Regular.ttf");
    requireFont("Alegreya", "root://alegreya/Alegreya-Bold.ttf", "bold");
    whenReady(function (err) {
        if (err) {
            cb(err);
        }
        else {
            try {
                var factory = makeFactory();
                cb(null, stringToDocument(src, factory), factory);
            }
            catch (err) {
                cb(err);
            }
        }
    });
}
//# sourceMappingURL=engine_import.js.map