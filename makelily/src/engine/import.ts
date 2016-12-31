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

/**
 * @file models/musicxml/import.ts tools for converting MXMLJSON to SatieJSON
 */

import {ScoreTimewise, Attributes, Note, Backup, Forward, Time, Direction, parseScore}
    from "musicxml-interfaces";
import {buildNote} from "musicxml-interfaces/builders";
import {map, reduce, some, filter, minBy, times, every, forEach, startsWith, endsWith} from "lodash";
import * as invariant from "invariant";

import {Document} from "../document/document";

import IMeasure from "../document/measure";
import OwnerType from "../document/ownerTypes";
import IMeasurePart from "../document/measurePart";
import IModel from "../document/model";
import Type from "../document/types";

import IFactory from "../private/factory";
import ILayoutOptions from "../private/layoutOptions";
import {MAX_SAFE_INTEGER} from "../private/constants";
import ILinesLayoutState from "../private/linesLayoutState";
import IChord, {fromModel as chordFromModel, barDivisionsDI, divisions as calcDivisions} from "../private/chordUtil";
import {scoreParts} from "../private/part";
import {lcm} from "../private/util";
import {requireFont, whenReady} from "../private/fontManager";

import validate from "./processors/validate";
import ScoreHeader from "./scoreHeader";
import {makeFactory} from "./setup";

/*---- Exports ----------------------------------------------------------------------------------*/

export function stringToDocument(src: string, memo$: any, factory: IFactory) {
    let mxmljson = parseScore(src);
    if ((mxmljson as any).error) {
        throw (mxmljson as any).error;
    }
    let document = timewiseStructToDocument(mxmljson, factory);
    if (document.error) {
        throw document.error;
    }

    let contextOptions: ILayoutOptions = {
        document,
        attributes: null,
        preview: false,
        header: document.header,
        measures: document.measures,
        modelFactory: factory,
        page$: 0,
        postprocessors: [],
        preprocessors: factory.preprocessors,
        print$: null,
        fixup: null
    };
    validate(contextOptions, memo$);
    ScoreHeader.prototype.overwriteEncoding.call(document.header);

    return document;
}

/**
 * Converts a timewise MXMLJSON score to an uninitialized Satie score.
 * See also Models.importXML.
 * 
 * @param score produced by github.com/jnetterf/musicxml-interfaces
 * @returns A structure that can be consumed by a score. If an error occurred
 *          error will be set, and all other properties will be null.
 */
export function timewiseStructToDocument(score: ScoreTimewise, factory: IFactory): Document {
    try {
        let header = _extractMXMLHeader(score);
        let partData = _extractMXMLPartsAndMeasures(score, factory);
        if (partData.error) {
            return new Document(null, null, null, null, new Error(partData.error));
        }

        return new Document(header, partData.measures, partData.parts, factory);
    } catch (error) {
        return new Document(null, null, null, null, error);
    }
}

/*---- Private ----------------------------------------------------------------------------------*/

export function _extractMXMLHeader(m: ScoreTimewise): ScoreHeader {
    let header = new ScoreHeader({
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

export function _extractMXMLPartsAndMeasures(input: ScoreTimewise, factory: IFactory):
        {measures?: IMeasure[]; parts?: string[]; error?: string} {

    let parts: string[] = map(scoreParts(input.partList), inPart => inPart.id);
    let createModel: typeof factory.create = factory.create.bind(factory);

    // TODO/STOPSHIP - sync division count in each measure
    let divisions = 384; // lilypond-regression 41g.xml does not specify divisions
    let gStaves = 0;
    let lastNote: IChord = null;
    let lastAttribs: Attributes = null;
    let maxVoice = 0;

    let measures: IMeasure[] = map(input.measures,
            (inMeasure, measureIdx) => {

        let measure = {
            idx: measureIdx,
            implicit: inMeasure.implicit,
            nonControlling: inMeasure.nonControlling,
            number: inMeasure.number,
            parts: <{[key: string]: IMeasurePart}> {},
            uuid: Math.floor(Math.random() * MAX_SAFE_INTEGER),
            width: inMeasure.width,
            version: 0
        };

        if (Object.keys(inMeasure.parts).length === 1 && "" in inMeasure.parts) {
            // See lilypond-regression >> 41g.
            inMeasure.parts[parts[0]] = inMeasure.parts[""];
            delete inMeasure.parts[""];
        }
        let linkedParts = map(inMeasure.parts, (val, key) => {
            if (!some(parts, part => part === key)) {
                // See lilypond-regression >> 41h.
                return null;
            }
            let output: IMeasurePart = {
                staves: [],
                voices: []
            };
            invariant(!(key in measure.parts), "Duplicate part ID %s", key);
            measure.parts[key] = output;
            invariant(!!key, "Part ID must be defined");

            return {
                division: 0,
                divisionPerStaff: <number[]>[],
                divisionPerVoice: <number[]>[],
                id: key,
                idx: 0,
                input: val,
                lastNote: <IChord> null,
                output: output,
                times: <Time[]> [{
                    beatTypes: [4],
                    beats: ["4"]
                }]
            };
        });

        linkedParts = filter(linkedParts, p => !!p);

        let commonDivisions = reduce(linkedParts, (memo, part) => {
            return reduce(part.input, (memo, input) => {
                if (input._class === "Attributes" && input.divisions) {
                    return lcm(memo, input.divisions);
                }
                return memo;
            }, memo);
        }, divisions);

        // Lets normalize divisions here.
        forEach(linkedParts, part => {
            let previousDivisions = divisions;
            forEach(part.input, input => {
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

        let target = linkedParts[0];
        // Create base structure
        while (!done()) {
            // target is accessed outside loop in syncStaffDivisions
            target = minBy(linkedParts, part => part.idx === part.input.length ?
                    MAX_SAFE_INTEGER : part.division);
            invariant(!!target, "Target not specified");
            let input = target.input[target.idx];
            let prevStaff = 1;
            switch (input._class) {
                case "Note":
                    let note: Note = input;

                    // TODO: is this the case even if voice/staff don't match up?
                    if (!!note.chord) {
                        lastNote.push(note);
                        note = lastNote;
                    } else {
                        // Notes go in the voice context.
                        let voice = note.voice || 1;
                        let staff = note.staff || 1;
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
                        target.divisionPerVoice[voice] = target.divisionPerVoice[voice] || 0;
                        invariant(target.division >= target.divisionPerVoice[voice],
                                "Ambiguous voice timing: all voices must be monotonic.");
                        if (target.divisionPerVoice[voice] < target.division) {
                            // Add rest
                            let divisionsInVoice = target.divisionPerVoice[voice];
                            // This beautiful IIFE is needed because of undefined behaviour for
                            // block-scoped variables in modules.
                            let restModel = ((divisionsInVoice: number) =>
                                    factory.fromSpec(
                                        buildNote(note => note
                                            .printObject(false)
                                        .rest({})
                                        .duration(target.division - divisionsInVoice)))
                                    )
                                (divisionsInVoice);

                            let spacerRest = chordFromModel(restModel);
                            let division = target.divisionPerVoice[voice];
                            spacerRest[0].duration = target.division - division;
                            target.output.voices[voice].push(restModel);
                            target.divisionPerVoice[voice] = target.division;
                        }

                        // Add the note to the voice segment and register it as the
                        // last inserted note
                        let newNote = factory.fromSpec(input);
                        target.output.voices[voice].push(newNote);
                        note = chordFromModel(newNote);

                        // Update target division
                        let divs = calcDivisions([input], {
                            time: target.times[0],
                            divisions
                        });
                        target.divisionPerVoice[voice] += divs;
                        target.division += divs;
                    }

                    invariant(!!note, "Must set lastNote to a note...");
                    lastNote = <any> note;
                    break;
                case "Attributes":
                case "Barline":
                case "Direction":
                case "FiguredBass":
                case "Grouping":
                case "Harmony":
                case "Print":
                case "Sound":
                    const staff = input._class === "Harmony" && !input.staff ? prevStaff :
                        input.staff || 1; // Explodes to all staves at a later point.
                    prevStaff = staff;
                    if (!(staff in target.output.staves)) {
                        target.output.staves[staff] = <any> [];
                        target.output.staves[staff].owner = staff;
                        target.output.staves[staff].ownerType = OwnerType.Staff;
                    }
                    let newModel = factory.fromSpec(input);

                    // Check if this is metadata:
                    if (input._class === "Direction") {
                        let direction = newModel as any as Direction;
                        let words = direction.directionTypes.length === 1 && direction.directionTypes[0].words;
                        if (words && words.length === 1) {
                            let maybeMeta = words[0].data.trim();
                            if (startsWith(maybeMeta, "SATIE_SONG_META = ") && endsWith(maybeMeta, ";")) {
                                // let songMeta = JSON.parse(maybeMeta.replace(/^SATIE_SONG_META = /, "").replace(/;$/, ""));
                                break; // Do not actually import as direction
                            } else if (startsWith(maybeMeta, "SATIE_MEASURE_META = ") && endsWith(maybeMeta, ";")) {
                                let measureMeta = JSON.parse(maybeMeta.replace(/^SATIE_MEASURE_META = /, "").replace(/;$/, ""));
                                measure.uuid = measureMeta.uuid;
                                break; // Do not actually import as direction
                            }
                        }
                    }

                    syncAppendStaff(staff, newModel, input.divisions || divisions);
                    if (input._class === "Attributes") {
                        lastAttribs = <Attributes> input;
                        divisions = lastAttribs.divisions || divisions;
                        let oTimes = lastAttribs.times;
                        if (oTimes && oTimes.length) {
                            target.times = oTimes;
                        }
                        let staves = lastAttribs.staves || 1;
                        gStaves = staves;
                        times(staves, staffMinusOne => {
                            let staff = staffMinusOne + 1;
                            if (!(staff in target.output.staves)) {
                                createStaff(staff, target.output);
                            }
                        });
                    }
                    break;
                case "Forward":
                    let forward = <Forward> input;
                    forEach(target.output.staves, (staff, staffIdx) => {
                        syncAppendStaff(staffIdx, null, input.divisions || divisions);
                    });
                    target.division += forward.duration;
                    break;
                case "Backup":
                    let backup = <Backup> input;
                    forEach(target.output.staves, (staff, staffIdx) => {
                        syncAppendStaff(staffIdx, null, input.divisions || divisions);
                    });
                    target.division -= backup.duration;
                    break;
                default:
                    invariant(false, "Unknown type %s", input._class);
                    break;
            }
            ++target.idx;
        }

        // Finish up

        times(gStaves, staffMinusOne => {
            let staff = staffMinusOne + 1;
            if (!(staff in target.output.staves)) {
                createStaff(staff, target.output);
                maxVoice++;
                let voice = createVoice(maxVoice, target.output);
                let newNote: IChord = <any> factory.create(Type.Chord);
                newNote.push({
                    duration: barDivisionsDI(lastAttribs.times[0], lastAttribs.divisions),
                    rest: {},
                    staff: staff,
                    voice: maxVoice
                });
                voice.push(<any>newNote);
            }
        });

        forEach(linkedParts, part => {
            // Note: target is 'var'-scoped!
            target = part;

            // Set divCounts of final elements in staff segments and divisions of all segments
            forEach(target.output.staves, (staff, staffIdx) => {
                syncAppendStaff(staffIdx, null, divisions);

                let segment = target.output.staves[staffIdx];
                if (segment) {
                    segment.divisions = divisions;
                }
            });
            forEach(target.output.voices, (voice, voiceIdx) => {
                let segment = target.output.voices[voiceIdx];
                if (segment) {
                    segment.divisions = divisions;
                }
            });
        });

        function syncAppendStaff(staff: number, model: IModel, localDivisions: number) {
            let ratio = localDivisions / divisions || 1;
            const divCount = ratio * (target.division - (target.divisionPerStaff[staff] || 0));
            let segment = target.output.staves[staff];
            invariant(!!model && !!segment || !model, "Unknown staff %s");

            if (divCount > 0) {
                if (segment) {
                    if (segment.length) {
                        let model = segment[segment.length - 1];
                        model.divCount = model.divCount || 0;
                        model.divCount += divCount;
                    } else {
                        let model = createModel(Type.Spacer, {
                            divCount,
                            staff
                        });
                        segment.push(model);
                    }
                }
                target.divisionPerStaff[staff] = target.division;
            }

            if (model) {
                if (divCount >= 0 || !divCount) {
                    segment.push(model);
                } else {
                    let offset = divCount;
                    let spliced = false;
                    for (let i = segment.length - 1; i >= 0; --i) {
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
            return every(linkedParts, part => {
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

function createVoice(voice: number, output: IMeasurePart) {
    output.voices[voice] = <any> [];
    output.voices[voice].owner = voice;
    output.voices[voice].ownerType = OwnerType.Voice;
    return output.voices[voice];
}

function createStaff(staff: number, output: IMeasurePart) {
    output.staves[staff] = <any> [];
    output.staves[staff].owner = staff;
    output.staves[staff].ownerType = OwnerType.Staff;
    return output.staves[staff];
}

/**
 * Parses a MusicXML document and returns a Document.
 */
export function importXML(src: string, memo: ILinesLayoutState,
        cb: (error: Error, document?: Document, factory?: IFactory) => void) {
    requireFont("Bravura", "root://bravura/otf/Bravura.otf");
    requireFont("Alegreya", "root://alegreya/Alegreya-Regular.ttf");
    requireFont("Alegreya", "root://alegreya/Alegreya-Bold.ttf", "bold");
    whenReady((err) => {
        if (err) {
            cb(err);
        } else {
            try {
                let factory = makeFactory();
                cb(null, stringToDocument(src, memo, factory), factory);
            } catch (err) {
                cb(err);
            }
        }
    });
}
