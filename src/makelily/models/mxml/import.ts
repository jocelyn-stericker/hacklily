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
 * @file models/mxmljson.ts tools for converting MXMLJSON to SatieJSON
 */

"use strict";

import MusicXML         = require("musicxml-interfaces");
import _                = require("lodash");
import invariant        = require("react/lib/invariant");

import Engine           = require("../engine");
import Metre            = require("../chord/metre");

/*---- Exports ----------------------------------------------------------------------------------*/

/**
 * Converts a timewise MXMLJSON score to a Satie score.
 * 
 * @param score produced by github.com/ripieno/musicxml-interfaces
 * @returns A structure that can be consumed by a score. If an error occurred
 *          error will be set, and all other properties will be null.
 */
export function toScore(score: MusicXML.ScoreTimewise,
        factory: Engine.IModel.IFactory): Engine.IDocument {
    try {
        let header      = _extractMXMLHeader(score);
        let partData    = _extractMXMLPartsAndMeasures(score, factory);
        if (partData.error) {
            return partData;
        }

        return {
            header:     header,
            parts:      partData.parts,
            measures:   partData.measures,
            factory:    factory
        };
    } catch(err) {
        return {
            header:     null,
            parts:      null,
            voices:     null,
            error:      err
        };
    }
}

/*---- Private ----------------------------------------------------------------------------------*/

export function _extractMXMLHeader(m: MusicXML.ScoreTimewise): Engine.ScoreHeader {
    let header = new Engine.ScoreHeader({
        work:           m.work,
        movementNumber: m.movementNumber,
        movementTitle:  m.movementTitle,
        identification: m.identification,
        defaults:       m.defaults,
        credits:        m.credits,
        partList:       m.partList
    });

    // Add credits to help exporters don't record credits, but do record movementTitle.
    if ((!header.credits || !header.credits.length) && header.movementTitle) {
        header.title = header.movementTitle;
    }

    return header;
}

export function _extractMXMLPartsAndMeasures(input: MusicXML.ScoreTimewise,
            factory: Engine.IModel.IFactory):
        {measures?: Engine.Measure.IMutableMeasure[]; parts?: string[]; error?: string} {

    let parts: string[] = _.map(input.partList.scoreParts, inPart => inPart.id);
    let createModel     = factory.create.bind(factory);

    // TODO/STOPSHIP - sync division count in each measure
    var divisions = 1; // lilypond-regression 41g.xml does not specify divisions

    let measures: Engine.Measure.IMutableMeasure[] = _.map(input.measures,
            (inMeasure, measureIdx) => {

        let measure = {
            idx:                measureIdx,
            uuid:               Math.floor(Math.random() * Engine.MAX_SAFE_INTEGER),
            number:             inMeasure.number,
            implicit:           inMeasure.implicit,
            width:              inMeasure.width,
            nonControlling:     inMeasure.nonControlling,
            parts:              <{[key: string]: Engine.Measure.IMeasurePart}> {}
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
            let output: Engine.Measure.IMeasurePart = {
                voices:     [],
                staves:     []
            };
            invariant(!(key in measure.parts), "Duplicate part ID %s", key);
            measure.parts[key] = output;
            invariant(!!key, "Part ID must be defined");

            return {
                id:                 key,
                input:              val,
                idx:                0,
                division:           0,
                divisionPerStaff:   <number[]>[],
                times:              <MusicXML.Time[]> [{
                    beats:              ["4"],
                    beatTypes:          [4]
                }],
                output:             output,
                lastNote:           <Engine.IChord> null
            };
        });

        linkedParts = _.filter(linkedParts, p => !!p);

        // TODO/STOPSHIP - sync division count in entire measure

        // Create base structure
        while (!done()) {
            // target is accessed outside loop in syncStaffDivisions
            var target = _.min(linkedParts, part => part.idx === part.input.length ?
                    Engine.MAX_SAFE_INTEGER : part.division);
            invariant(!!target, "Target not specified");
            let input = target.input[target.idx];
            let prevStaff = 1;
            switch(input._class) {
                case "Note":
                    let note: MusicXML.Note = input;

                    let chordContinues = !!note.chord;

                    // TODO: is this the case even if voice/staff don't match up?
                    if (input.lastNote) {
                        input.lastNote.push(note);
                        note = input.lastNote;
                    } else {
                        // Notes go in the voice context.
                        let voice = note.voice || 1;
                        let staff = note.staff || 1;
                        prevStaff = staff;
                        if (!(voice in target.output.voices)) {
                            target.output.voices[voice] = <any> [];
                            target.output.voices[voice].owner = voice;
                            target.output.voices[voice].ownerType = Engine.Measure.OwnerType.Voice;
                        }
                        // Make sure there is a staff segment reserved for the given staff
                        if (!(staff in target.output.staves)) {
                            target.output.staves[staff] = <any> [];
                            target.output.staves[staff].owner = staff;
                            target.output.staves[staff].ownerType = Engine.Measure.OwnerType.Staff;
                        }
                        let newNote = factory.fromSpec(input);
                        target.output.voices[voice].push(newNote);
                        note = Engine.IChord.fromModel(newNote);

                        // Update target division
                        let divs = Metre.calcDivisionsNoCtx([input], target.times, divisions);
                        target.division += divs;
                    }

                    input.lastNote = chordContinues ? note : null;
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
                        target.output.staves[staff].ownerType = Engine.Measure.OwnerType.Staff;
                    }
                    let newModel = factory.fromSpec(input);
                    syncAppendStaff(staff, newModel);
                    if (input._class === "Attributes") {
                        divisions = (<MusicXML.Attributes>input).divisions || divisions;
                        let oTimes = (<MusicXML.Attributes>input).times;
                        if (oTimes && oTimes.length) {
                            target.times = oTimes;
                        }
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

        // Finish-up
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

        function syncAppendStaff(staff: number, model: Engine.IModel) {
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
                        let model = createModel(Engine.IModel.Type.Spacer);
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
        measures:   measures,
        parts:      parts
    };
}
