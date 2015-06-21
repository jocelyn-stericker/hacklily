/**
 * (C) Josh Netterfield <joshua@nettek.ca> 2015.
 * Part of the Satie music engraver <https://github.com/ripieno/satie>.
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

"use strict";

import MusicXML = require("musicxml-interfaces");
import _ = require("lodash");
import invariant = require("react/lib/invariant");

import {IChord, IDocument, ILayoutOptions, IModel, IMeasurePart, IPart,
    IMutableMeasure, MAX_SAFE_INTEGER, OwnerType, validate} from "../../engine";
import {calcDivisionsNoCtx} from "../chord/metre";
import ScoreHeader from "../scoreHeader";

/*---- Exports ----------------------------------------------------------------------------------*/

export function stringToDocument(src: string, memo$: any, factory: IModel.IFactory) {
    let mxmljson = MusicXML.parse(src);
    if ((<any>mxmljson).error) {
        throw (<any>mxmljson).error;
    }
    let document = timewiseStructToDocument(mxmljson, factory);
    if (document.error) {
        throw document.error;
    }

    let contextOptions: ILayoutOptions = {
        attributes: null,
        header: document.header,
        measures: document.measures,
        modelFactory: factory,
        page$: 0,
        postprocessors: [],
        preprocessors: factory.preprocessors,
        print$: null
    };
    validate(contextOptions, memo$);
    ScoreHeader.prototype.overwriteEncoding.call(document.header);

    return document;
}

/**
 * Converts a timewise MXMLJSON score to an uninitialized Satie score.
 * See also Models.importXML.
 * 
 * @param score produced by github.com/ripieno/musicxml-interfaces
 * @returns A structure that can be consumed by a score. If an error occurred
 *          error will be set, and all other properties will be null.
 */
export function timewiseStructToDocument(score: MusicXML.ScoreTimewise,
        factory: IModel.IFactory): IDocument {
    try {
        let header = _extractMXMLHeader(score);
        let partData = _extractMXMLPartsAndMeasures(score, factory);
        if (partData.error) {
            return partData;
        }

        return {
            factory: factory,
            header: header,
            measures: partData.measures,
            parts: partData.parts
        };
    } catch(err) {
        return {
            error: err,
            header: null,
            parts: null,
            voices: null
        };
    }
}

/*---- Private ----------------------------------------------------------------------------------*/

export function _extractMXMLHeader(m: MusicXML.ScoreTimewise): ScoreHeader {
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

export function _extractMXMLPartsAndMeasures(input: MusicXML.ScoreTimewise,
            factory: IModel.IFactory):
        {measures?: IMutableMeasure[]; parts?: string[]; error?: string} {

    let parts: string[] = _.map(IPart.scoreParts(input.partList), inPart => inPart.id);
    let createModel = factory.create.bind(factory);

    // TODO/STOPSHIP - sync division count in each measure
    let divisions = 1; // lilypond-regression 41g.xml does not specify divisions
    let gStaves = 0;
    let lastNote: IChord = null;
    let lastAttribs: MusicXML.Attributes = null;
    let maxVoice = 0;

    let measures: IMutableMeasure[] = _.map(input.measures,
            (inMeasure, measureIdx) => {

        let measure = {
            idx: measureIdx,
            implicit: inMeasure.implicit,
            nonControlling: inMeasure.nonControlling,
            number: inMeasure.number,
            parts: <{[key: string]: IMeasurePart}> {},
            uuid: Math.floor(Math.random() * MAX_SAFE_INTEGER),
            width: inMeasure.width
        };

        if (Object.keys(inMeasure.parts).length === 1 && "" in inMeasure.parts) {
            // See lilypond-regression >> 41g.
            inMeasure.parts[parts[0]] = inMeasure.parts[""];
            delete inMeasure.parts[""];
        }
        let linkedParts = _.map(inMeasure.parts, (val, key) => {
            if (!_.any(parts, part => part === key)) {
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
                times: <MusicXML.Time[]> [{
                    beatTypes: [4],
                    beats: ["4"]
                }]
            };
        });

        linkedParts = _.filter(linkedParts, p => !!p);

        let target = linkedParts[0];
        // Create base structure
        while (!done()) {
            // target is accessed outside loop in syncStaffDivisions
            target = _.min(linkedParts, part => part.idx === part.input.length ?
                    MAX_SAFE_INTEGER : part.division);
            invariant(!!target, "Target not specified");
            let input = target.input[target.idx];
            let prevStaff = 1;
            switch(input._class) {
                case "Note":
                    let note: MusicXML.Note = input;

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
                            let spec = MusicXML.parse.note(`
                                <note print-object="no">
                                    <rest />
                                    <duration>
                                        ${target.division - target.divisionPerVoice[voice]}
                                    </duration>
                                </note>`);
                            let restModel = factory.fromSpec(spec);
                            let spacerRest = IChord.fromModel(restModel);
                            let division = target.divisionPerVoice[voice];
                            spacerRest[0].duration = target.division - division;
                            target.output.voices[voice].push(restModel);
                            target.divisionPerVoice[voice] = target.division;
                        }

                        // Add the note to the voice segment and register it as the
                        // last inserted note
                        let newNote = factory.fromSpec(input);
                        target.output.voices[voice].push(newNote);
                        note = IChord.fromModel(newNote);

                        // Update target division
                        let divs = calcDivisionsNoCtx([input], target.times, divisions);
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
                    syncAppendStaff(staff, newModel);
                    if (input._class === "Attributes") {
                        lastAttribs = <MusicXML.Attributes> input;
                        divisions = lastAttribs.divisions || divisions;
                        let oTimes = lastAttribs.times;
                        if (oTimes && oTimes.length) {
                            target.times = oTimes;
                        }
                        let staves = lastAttribs.staves || 1;
                        gStaves = staves;
                        _.times(staves, staffMinusOne => {
                            let staff = staffMinusOne + 1;
                            if (!(staff in target.output.staves)) {
                                createStaff(staff, target.output);
                            }
                        });
                    }
                    break;
                case "Backup":
                    let backup = <MusicXML.Backup> input;
                    _.forEach(target.output.staves, (staff, staffIdx) => {
                        syncAppendStaff(staffIdx, null);
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

        _.times(gStaves, staffMinusOne => {
            let staff = staffMinusOne + 1;
            if (!(staff in target.output.staves)) {
                createStaff(staff, target.output);
                maxVoice++;
                let voice = createVoice(maxVoice, target.output);
                let newNote: IChord = <any> factory.create(IModel.Type.Chord);
                newNote.push({
                    duration: IChord.barDivisions(lastAttribs),
                    rest: {},
                    staff: staff,
                    voice: maxVoice
                });
                voice.push(<any>newNote);
            }
        });

        _.forEach(linkedParts, part => {
            // Note: target is 'var'-scoped!
            target = part;

            // Create proxies for attributes, barlines, prints, and sounds.
            // let rootStaff = target.output.staves[1];
            // TODO: not implemented

            // Set divCounts of final elements in staff segments and divisions of all segments
            _.forEach(target.output.staves, (staff, staffIdx) => {
                syncAppendStaff(staffIdx, null);

                let segment = target.output.staves[staffIdx];
                if (segment) {
                    segment.divisions = divisions;
                }
            });
            _.forEach(target.output.voices, (voice, voiceIdx) => {
                let segment = target.output.voices[voiceIdx];
                if (segment) {
                    segment.divisions = divisions;
                }
            });
        });

        function syncAppendStaff(staff: number, model: IModel) {
            const divCount = target.division - (target.divisionPerStaff[staff] || 0);
            let segment = target.output.staves[staff];
            invariant(!!model && !!segment || !model, "Unknown staff %s");

            if (divCount > 0) {
                if (segment) {
                    if (segment.length) {
                        let model = segment[segment.length - 1];
                        model.divCount = model.divCount || 0;
                        model.divCount += divCount;
                    } else {
                        let model = createModel(IModel.Type.Spacer);
                        model.divCount = divCount;
                        model.staff = staff;
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
            return _.all(linkedParts, part => {
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
