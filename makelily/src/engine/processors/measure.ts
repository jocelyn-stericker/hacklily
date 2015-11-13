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
 * @file engine/measureProcessor.ts provides function for validating or laying out a measure
 */

import {ScoreHeader} from "musicxml-interfaces";
import {IAny} from "musicxml-interfaces/operations";
import {indexBy, filter, map, reduce, values, flatten, forEach, extend} from "lodash";
import invariant = require("invariant");

import IMeasure from "../../document/measure";
import IModel from "../../document/model";
import Type from "../../document/types";
import ISegment from "../../document/segment";
import IMeasurePart from "../../document/measurePart";
import OwnerType from "../../document/ownerTypes";

import ICursor from "../../private/cursor";
import IAttributesSnapshot from "../../private/attributesSnapshot";
import ILineContext from "../../private/lineContext";
import IMeasureContext, {detachMeasureContext} from "../../private/measureContext";
import IVoiceContext from "../../private/voiceContext";
import IStaffContext, {detachStaffContext} from "../../private/staffContext";
import IFactory from "../../private/factory";
import ILayout from "../../private/layout";
import ICombinedLayout, {mergeSegmentsInPlace} from "../../private/combinedLayout";
import IMeasureLayout from "../../private/measureLayout";
import ILinesLayoutState from "../../private/linesLayoutState";
import IChord from "../../private/chord";
import {MAX_SAFE_INTEGER} from "../../private/constants";
import {scoreParts} from "../../private/part";
import {subtract} from "../../private/metre";

export interface IMeasureLayoutOptions {
    attributes: {[part: string]: IAttributesSnapshot[]};
    header: ScoreHeader;
    line: ILineContext;
    measure: IMeasure;
    /** Starts at 0. */
    x: number;

    /** @private approximate minimum width is being calculated */
    _approximate?: boolean;

    /** @private does not have own attributes (true if approximate or grace notes) */
    _detached?: boolean;

    padEnd?: boolean;

    factory: IFactory;
    preview: boolean;
    memo$: ILinesLayoutState;
    fixup: (segment: ISegment, operations: IAny[]) => void;
}

/**
 * Given a cursor skeleton, creates a detached mutable cursor.
 *
 * For use by MeasureProcessor.
 */
function createCursor(
        spec: {
            _approximate: boolean;
            _detached: boolean;
            factory: IFactory;
            header: ScoreHeader,
            line: ILineContext;
            measure: IMeasureContext;
            segment: ISegment;
            staff: IStaffContext;
            voice: IVoiceContext;
            x: number;
            page: number;
            fixup?: (segment: ISegment, operations: IAny[]) => void;
            memo$: ILinesLayoutState;
        }): ICursor {
    return {
        approximate: spec._approximate,
        detached: spec._detached,
        division$: 0,
        factory: spec.factory,
        header: spec.header,
        idx$: 0,
        line: spec.line,
        maxPaddingBottom$: [],
        maxPaddingTop$: [],
        measure: spec.measure,
        print$: null,
        segment: spec.segment,
        staff: detachStaffContext(spec.staff),
        voice: spec.voice,
        x$: spec.x,
        page$: spec.page,
        fixup: spec.fixup
    };
}

/**
 * Given a bunch of segments and the context (measure, line), returns information needed to lay the
 * models out. Note that the order of the output is arbitrary and may not correspond to the order
 * of the input segments.
 *
 * @segments Models to lay out or validate.
 * @measure Model to which the model belongs to.
 * @line Line context
 *
 * Complexity: O(staff-voice pairs)
 */
export function reduceMeasure(spec: ILayoutOpts): IMeasureLayout {
    let gLine = spec.line;
    let gMeasure = spec.measure;
    let gValidateOnly = spec._validateOnly;
    let gSomeLastAttribs = <{[part: string]: IAttributesSnapshot[]}> {};
    let gMaxDivisions = 0;

    invariant(spec.segments.length >= 1, "_processMeasure expects at least one segment.");

    let gStaffMeasure: { [key: string]: ISegment } =
        indexBy(filter(spec.segments,
            seg => seg.ownerType === OwnerType.Staff),
            seg => `${seg.part}_${seg.owner}`);

    let gVoiceMeasure: { [key: string]: ISegment } =
        indexBy(filter(spec.segments,
            seg => seg.ownerType === OwnerType.Voice),
            seg => `${seg.part}_${seg.owner}`);

    let gStaffLayouts$: { [key: string]: ILayout[][] } = {};

    let gMaxXInMeasure = gMeasure.x;
    let gMaxPaddingTopInMeasure$     = <number[]> [];
    let gMaxPaddingBottomInMeasure$  = <number[]> [];

    let gDivOverflow: DivisionOverflowException = null;

    let gVoiceLayouts$ = map(gVoiceMeasure, segment => {
        let lastAttribs: IAttributesSnapshot = Object.create(spec.attributes || {});
        let voice = {} as IVoiceContext;
        let {part} = segment;
        gSomeLastAttribs[part] = gSomeLastAttribs[part] || [];

        let voiceStaves$: {[key: number]: ILayout[]}  = {};
        let staffContexts$: {[key: number]: IStaffContext} = {};
        let divisionPerStaff$: {[key: string]: number} = {};
        let xPerStaff$: {[key: number]: number} = [];

        let cursor$ = createCursor({
            segment: segment,

            voice: voice,
            staff: null,
            measure: gMeasure,
            line: gLine,
            header: spec.header,

            x: gMeasure.x,

            page: spec._approximate ? NaN : 1,

            _approximate: spec._approximate,
            _detached: spec._detached,
            factory: spec.factory,
            memo$: spec.memo$,
            fixup: spec.fixup
        });

        /**
         * Processes a staff model within this voice's context.
         */
        function pushStaffSegment(staffIdx: number, model: IModel, catchUp: boolean) {
            if (!model) {
                divisionPerStaff$[staffIdx] = cursor$.division$ + 1;
                return;
            }
            let oldDivision = cursor$.division$;
            let oldSegment = cursor$.segment;
            let oldIdx = cursor$.idx$;
            cursor$.division$ = divisionPerStaff$[staffIdx];
            if (catchUp) {
                cursor$.x$ = xPerStaff$[staffIdx];
            }
            cursor$.segment = gStaffMeasure[`${part}_${staffIdx}`];
            cursor$.idx$ = voiceStaves$[staffIdx].length;
            let layout: ILayout;
            model.key = `SATIE${cursor$.measure.uuid}_parts_${cursor$.segment.part}_staves_${
                cursor$.segment.owner}_${cursor$.idx$}`;
            if (gValidateOnly) {
                model.staffIdx = cursor$.staff.idx;
                model.__validate(cursor$);
            } else {
                layout = model.__layout(cursor$);
                layout.part = part;
                (<any>layout).key = (<any>model).key;
            }
            invariant(isFinite(model.divCount), "%s should be a constant division count",
                    model.divCount);
            cursor$.division$ += model.divCount;

            if (cursor$.division$ > cursor$.staff.totalDivisions && !!gDivOverflow) {
                // Note: unfortunate copy-pasta.
                if (!gDivOverflow) {
                    gDivOverflow = new DivisionOverflowException(
                        cursor$.staff.totalDivisions, spec.measure.parent);
                }

                invariant(cursor$.staff.totalDivisions === gDivOverflow.maxDiv,
                        "Divisions are not consistent. Found %s but expected %s",
                        cursor$.staff.totalDivisions, gDivOverflow.maxDiv);

                if (!gDivOverflow.newParts[segment.part]) {
                    gDivOverflow.newParts[segment.part] = {
                        voices: [],
                        staves: []
                    };
                }
                let newStaves = gDivOverflow.newParts[segment.part].staves;
                let oldStaves = gDivOverflow.oldParts[segment.part].staves;
                if (!newStaves[staffIdx]) {
                    let length = voiceStaves$[staffIdx].length + 1;
                    let nv = newStaves[staffIdx] = <any> [];
                    let ov = oldStaves[staffIdx] = <any> cursor$.segment.slice(0, length);

                    ov.owner = nv.owner = staffIdx;
                    ov.ownerType = nv.ownerType = OwnerType.Staff;
                    ov.divisions = nv.divisions = cursor$.segment.divisions;
                    ov.part = nv.part = cursor$.segment.part;
                    invariant(ov[ov.length - 1] === model, "tx");
                } else {
                    let divOffset = cursor$.division$ - cursor$.staff.totalDivisions -
                        reduce(newStaves[staffIdx], (sum, model) => sum + model.divCount, 0);
                    if (divOffset > 0) {
                        let spacer = spec.factory.create(Type.Spacer);
                        spacer.divCount = divOffset;
                        newStaves[staffIdx].push(spacer);
                    }
                    newStaves[staffIdx].push(model);
                }
            }

            divisionPerStaff$[staffIdx] = cursor$.division$;
            xPerStaff$[staffIdx] = cursor$.x$;
            cursor$.division$ = oldDivision;
            cursor$.segment = oldSegment;
            cursor$.idx$ = oldIdx;

            if (!gValidateOnly) {
                invariant(!!layout, "%s must be a valid layout", layout);
            }
            voiceStaves$[staffIdx].push(layout);
        }

        let segmentLayout$: ILayout[] = [];
        for (let i = 0; i < segment.length; ++i) {
            const model = segment[i];

            const atEnd = i + 1 === segment.length;
            const staffIdx: number = model.staffIdx;
            invariant(isFinite(model.staffIdx), "%s is not finite", model.staffIdx);
            if (!cursor$.maxPaddingTop$[model.staffIdx]) {
                cursor$.maxPaddingTop$[model.staffIdx] = 0;
            }
            if (!cursor$.maxPaddingBottom$[model.staffIdx]) {
                cursor$.maxPaddingBottom$[model.staffIdx] = 0;
            }

            // Create a voice-staff pair if needed. We'll later merge all the
            // voice staff pairs.
            spec.attributes[part] = spec.attributes[part] || [];
            if (!voiceStaves$[staffIdx]) {
                voiceStaves$[staffIdx] = [];
                staffContexts$[staffIdx] = {
                    accidentals$: {},
                    attributes: spec.attributes[part][staffIdx],
                    totalDivisions: NaN,
                    previous: null,
                    idx: staffIdx
                };

                gStaffLayouts$[`${part}_${staffIdx}`] = gStaffLayouts$[`${part}_${staffIdx}`] || [];
                gStaffLayouts$[`${part}_${staffIdx}`].push(voiceStaves$[staffIdx]);
                divisionPerStaff$[staffIdx] = 0;
                xPerStaff$[staffIdx] = 0;
            }

            cursor$.idx$ = i;
            cursor$.staff = staffContexts$[staffIdx];

            while (divisionPerStaff$[staffIdx] <= cursor$.division$) {
                let nextStaffEl = gStaffMeasure[`${part}_${staffIdx}`]
                    [voiceStaves$[staffIdx].length];

                // We can mostly ignore priorities here, since except for one exception,
                // staff segments are more important than voice segments. The one exception
                // is barlines:
                let nextIsBarline = spec.factory.modelHasType(nextStaffEl, Type.Barline);
                if (nextIsBarline && divisionPerStaff$[staffIdx] === cursor$.division$) {
                    break;
                }

                // Process a staff model within a voice context.
                let catchUp = divisionPerStaff$[staffIdx] < cursor$.division$;
                pushStaffSegment(staffIdx, nextStaffEl, catchUp);
                invariant(isFinite(divisionPerStaff$[staffIdx]), "divisionPerStaff$ is supposed " +
                    "to be a number, got %s", divisionPerStaff$[staffIdx]);
            }

            // All layout that can be controlled by the model is done here.
            let layout: ILayout;
            model.key = `SATIE${cursor$.measure.uuid}_parts_${cursor$.segment.part}_voices_${
                cursor$.segment.owner}_${cursor$.idx$}`;
            if (gValidateOnly) {
                model.staffIdx = cursor$.staff.idx;
                model.__validate(cursor$);
            } else {
                layout = model.__layout(cursor$);
                layout.part = part;
                (<any>layout).key = (<any>model).key;
            }
            cursor$.division$ += model.divCount;
            gMaxDivisions = Math.max(gMaxDivisions, cursor$.division$);

            if (cursor$.division$ > cursor$.staff.totalDivisions && !spec.preview) {
                // Note: unfortunate copy-pasta.
                if (!gDivOverflow) {
                    gDivOverflow = new DivisionOverflowException(
                        cursor$.staff.totalDivisions, spec.measure.parent);
                }

                invariant(cursor$.staff.totalDivisions === gDivOverflow.maxDiv,
                        "Divisions are not consistent. Found %s but expected %s",
                        cursor$.staff.totalDivisions, gDivOverflow.maxDiv);
                invariant(!!segment.part,
                    "Part must be defined -- is this spec from Engine.validate$?");

                if (!gDivOverflow.newParts[segment.part]) {
                    gDivOverflow.newParts[segment.part] = {
                        voices: [],
                        staves: []
                    };
                }
                let newVoices = gDivOverflow.newParts[segment.part].voices;
                let oldVoices = gDivOverflow.oldParts[segment.part].voices;

                if (!newVoices[segment.owner]) {
                    let nv = newVoices[segment.owner] = <any> [];
                    let ov = oldVoices[segment.owner] = <any> segment.slice(0, cursor$.idx$);

                    ov.owner = nv.owner = cursor$.segment.owner;
                    ov.ownerType = nv.ownerType = OwnerType.Voice;
                    ov.divisions = nv.divisions = cursor$.segment.divisions;
                    ov.part = nv.part = cursor$.segment.part;
                }

                newVoices[segment.owner].push(model);
            }

            if (atEnd) {
                if (cursor$.division$ < cursor$.staff.totalDivisions &&
                        (!cursor$.staff.attributes ||
                            cursor$.staff.attributes.time.senzaMisura === null) &&
                        !spec.preview) {
                    const durationSpecs = subtract(cursor$.staff.totalDivisions,
                            cursor$.division$, cursor$);
                    const restSpecs: IChord[] = map(durationSpecs, durationSpec => {
                        let chord = [{
                            rest: {},
                            dots: durationSpec[0].dots,
                            noteType: durationSpec[0].noteType
                        }] as IChord;
                        chord._class = "Chord";
                        return chord;
                    });

                    cursor$.fixup(segment, map(restSpecs, (spec, idx) => ({
                        p: [
                            String(cursor$.measure.uuid),
                            "parts",
                            part,
                            "voices",
                            segment.owner,
                            segment.length + idx
                        ],

                        li: spec
                    })));
                } else {
                    // Finalize.
                    forEach(gStaffMeasure, (staff, idx) => {
                        const pIdx = idx.lastIndexOf("_");
                        const staffMeasurePart = idx.substr(0, pIdx);
                        if (staffMeasurePart !== part) {
                            return;
                        }
                        const nidx = parseInt(idx.substr(pIdx + 1), 10);

                        let voiceStaff = voiceStaves$[<any>nidx];
                        if (!!staff && !!voiceStaff) {
                            while (voiceStaff.length < staff.length) {
                                pushStaffSegment(nidx, staff[voiceStaff.length], false);
                            }
                        }
                    });
                }
            }
            lastAttribs = cursor$.staff.attributes;
            gSomeLastAttribs[segment.part][model.staffIdx] = lastAttribs;
            gMaxXInMeasure = Math.max(cursor$.x$, gMaxXInMeasure);
            gMaxPaddingTopInMeasure$[model.staffIdx] = Math.max(
                cursor$.maxPaddingTop$[model.staffIdx],
                gMaxPaddingTopInMeasure$[model.staffIdx] || 0);
            gMaxPaddingBottomInMeasure$[model.staffIdx] = Math.max(
                cursor$.maxPaddingBottom$[model.staffIdx],
                gMaxPaddingBottomInMeasure$[model.staffIdx] || 0);
            segmentLayout$.push(layout);
        }

        return segmentLayout$;
    });

    if (gDivOverflow) {
        throw gDivOverflow;
    }

    // Get an ideal voice layout for each voice-staff combination
    let gStaffLayoutsUnkeyed$: ILayout[][][] = values(gStaffLayouts$) as ILayout[][][];
    let gStaffLayoutsCombined: ILayout[][] = <any> flatten(gStaffLayoutsUnkeyed$);

    // Create a layout that satisfies the constraints in every single voice.
    // IModel.mergeSegmentsInPlace requires two passes to fully merge the layouts.
    // We do the second pass once we filter unneeded staff segments.
    let gAllLayouts$ = gStaffLayoutsCombined.concat(gVoiceLayouts$);

    // We have a staff layout for every single voice-staff combination.
    // They will be merged, so it doesn't matter which one we pick.
    // Pick the first.
    let gStaffLayoutsUnique$ = map(gStaffLayoutsUnkeyed$, layouts => layouts[0]);

    if (!spec._noAlign) {
        // Calculate and finish applying the master layout.
        // Two passes is always sufficient.
        let masterLayout = reduce(gAllLayouts$, mergeSegmentsInPlace, []);
        // Avoid lining up different divisions
        reduce(masterLayout, ({prevDivision, min}: ISpreadMemo, layout: ICombinedLayout) => {
            let newMin = layout.x;
            if (min >= layout.x && layout.division !== prevDivision &&
                    layout.renderClass !== Type.Spacer &&
                    layout.renderClass !== Type.Barline) {
                layout.x = min + 20;
            }
            return {
                prevDivision: layout.division,
                min: newMin
            };
        }, {prevDivision: -1, min: -10});
        reduce(gVoiceLayouts$, mergeSegmentsInPlace, masterLayout);

        // Merge in the staves
        reduce(gStaffLayoutsUnique$, mergeSegmentsInPlace, masterLayout);
    }

    let gPadding: number;

    if (gMaxXInMeasure === gMeasure.x || !spec.padEnd) {
        gPadding = 0;
    } else {
        gPadding = 15;
    }

    return {
        attributes: gSomeLastAttribs,
        elements: gStaffLayoutsUnique$.concat(gVoiceLayouts$),
        width: gMaxXInMeasure + gPadding - gMeasure.x,
        maxDivisions: gMaxDivisions,
        originX: gMeasure.x,
        originY: {},
        paddingTop: gMaxPaddingTopInMeasure$,
        paddingBottom: gMaxPaddingBottomInMeasure$,
        getVersion: () => gMeasure.parent.version,
        uuid: gMeasure.parent.uuid
    };
}

interface ISpreadMemo {
    prevDivision: number;
    min: number;
}

export interface ILayoutOpts {
    attributes: {[key: string]: IAttributesSnapshot[]};
    factory: IFactory;
    header: ScoreHeader;
    line: ILineContext;
    measure: IMeasureContext;
    segments: ISegment[];

    _noAlign?: boolean;
    _approximate?: boolean;
    _detached?: boolean;
    _validateOnly?: boolean;
    padEnd: boolean;
    preview: boolean;
    memo$: ILinesLayoutState;
    fixup: (segment: ISegment, operations: IAny[]) => void;
}

/**
 * Given the context and constraints given, creates a possible layout for items within a measure.
 *
 * @param opts structure with __normalized__ voices and staves
 * @returns an array of staff and voice layouts with an undefined order
 */
export function layoutMeasure(
        {
            header,
            measure,
            line,
            attributes,
            factory,
            padEnd,
            _approximate,
            _detached,
            x,
            preview,
            memo$,
            fixup
        }: IMeasureLayoutOptions): IMeasureLayout {

    let measureCtx = detachMeasureContext(measure, x);

    let parts = map(scoreParts(header.partList), part => part.id);
    let staves = flatten(map(parts, partId => measure.parts[partId].staves)) as ISegment[];
    let voices = flatten(map(parts, partId => measure.parts[partId].voices)) as ISegment[];

    let segments = filter(voices.concat(staves), s => !!s);

    return reduceMeasure({
        attributes,
        factory,
        header,
        line,
        measure: measureCtx,
        segments,
        padEnd,

        _approximate,
        _detached,
        preview,
        memo$,
        fixup
    });
}

/**
 * Given the context and constraints given, estimates a width. These widths do not
 *
 * @param opts structure with __normalized__ voices and staves
 * @returns an approximate width for a measure that is not the first on a line.
 */
export function approximateLayout(opts: IMeasureLayoutOptions): IMeasureLayout {
    invariant(!!opts.line, "approximateLayout() needs `opts.line` to be set");

    opts = <IMeasureLayoutOptions> extend({
            _approximate: true,
            _detached: true
        }, opts);
    return layoutMeasure(opts);
}

export declare class Error {
    constructor();
    message: string;
    stack: any;
}

export class DivisionOverflowException extends Error {
    maxDiv: number;
    oldParts: {
        [id: string]: IMeasurePart;
    };
    newParts: {
        [id: string]: IMeasurePart;
    } = {};
    measureIdx: number;

    constructor(maxDiv: number, measure: IMeasure) {
        super();
        this.measureIdx = measure.idx;
        this.message = "DivisionOverflowException: max division should be " +
            `${maxDiv} in measure ${this.measureIdx}`;
        this.stack = (new Error).stack;
        this.maxDiv = maxDiv;
        this.oldParts = measure.parts;
    }

    resolve$(measures$: IMeasure[]) {
        let oldMeasure$ = measures$[this.measureIdx];

        forEach(this.oldParts, (part, partID) => {
            forEach(part.staves, (staff, staffIdx) => {
                if (!staff) {
                    this.newParts[partID].staves[staffIdx] =
                        this.newParts[partID].staves[staffIdx] || null;
                } else {
                    this.newParts[partID].staves[staffIdx] =
                        this.newParts[partID].staves[staffIdx] || <any>[];
                    let nv = this.newParts[partID].staves[staffIdx];
                    nv.divisions = staff.divisions;
                    nv.part = staff.part;
                    nv.owner = staff.owner;
                    nv.ownerType = staff.ownerType;
                }
            });
        });
        let newMeasure = {
            idx: this.measureIdx + 1,
            uuid: Math.floor(Math.random() * MAX_SAFE_INTEGER),
            number: "" + (parseInt(oldMeasure$.number, 10) + 1),
            implicit: false,
            width: NaN,
            nonControlling: false,
            parts: this.newParts,
            version: 0
        };

        oldMeasure$.parts = this.oldParts;
        measures$.splice(this.measureIdx + 1, 0, newMeasure);
    }
}
