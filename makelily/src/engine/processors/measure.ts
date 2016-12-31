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
 * @file engine/processors/measure.ts provides functions for validating and laying out measures
 */

import * as invariant from "invariant";
import {IAny} from "musicxml-interfaces/operations";
import {ScoreHeader, Print} from "musicxml-interfaces";
import {keyBy, filter, map, reduce, values, flatten, forEach, extend, some} from "lodash";

import IDocument from "../../document/document";
import IMeasure from "../../document/measure";
import IModel from "../../document/model";
import ISegment from "../../document/segment";
import OwnerType from "../../document/ownerTypes";
import Type from "../../document/types";

import IAttributesSnapshot from "../../private/attributesSnapshot";
import ICombinedLayout, {mergeSegmentsInPlace} from "../../private/combinedLayout";
import Cursor from "../../private/cursor";
import IFactory from "../../private/factory";
import ILayout from "../../private/layout";
import ILineContext from "../../private/lineContext";
import ILinesLayoutState from "../../private/linesLayoutState";
import IMeasureContext, {detachMeasureContext} from "../../private/measureContext";
import IMeasureLayout from "../../private/measureLayout";
import IStaffContext from "../../private/staffContext";
import IVoiceContext from "../../private/voiceContext";
import {scoreParts} from "../../private/part";

import DivisionOverflowException from "./divisionOverflowException";

export interface IMeasureLayoutOptions {
    document: IDocument;
    attributes: {[part: string]: IAttributesSnapshot[]};
    header: ScoreHeader;
    line: ILineContext;
    measure: IMeasure;
    print: Print;
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
    let gPrint: Print = spec.print;
    let gMaxDivisions = 0;

    invariant(spec.segments.length >= 1, "_processMeasure expects at least one segment.");

    let gStaffMeasure: { [key: string]: ISegment } =
        keyBy(filter(spec.segments,
            seg => seg.ownerType === OwnerType.Staff),
            seg => `${seg.part}_${seg.owner}`);

    let gVoiceMeasure: { [key: string]: ISegment } =
        keyBy(filter(spec.segments,
            seg => seg.ownerType === OwnerType.Voice),
            seg => `${seg.part}_${seg.owner}`);

    let gStaffLayouts$: { [key: string]: ILayout[][] } = {};

    let gMaxXInMeasure = gMeasure.x;
    let gMaxPaddingTopInMeasure$     = <number[]> [];
    let gMaxPaddingBottomInMeasure$  = <number[]> [];

    let gDivOverflow: DivisionOverflowException = null;
    let lastPrint = spec.print;

    let gVoiceLayouts$ = map(gVoiceMeasure, voiceSegment => {
        let voice = {} as IVoiceContext;
        let {part} = voiceSegment;
        gSomeLastAttribs[part] = gSomeLastAttribs[part] || [];

        let voiceStaves$: {[key: number]: ILayout[]}  = {};
        let staffContexts$: {[key: number]: IStaffContext} = {};
        let divisionPerStaff$: {[key: string]: number} = {};
        let xPerStaff$: {[key: number]: number} = [];

        let cursor$ = new Cursor({
            document: spec.document,
            segment: voiceSegment,

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
            print: lastPrint,
            fixup: (operations: IAny[]) => {
                const localSegment = cursor$.segment;
                const restartRequired = some(operations, op => {
                    if (op.p[0] === "divisions") {
                        return true;
                    }

                    invariant(String(op.p[0]) === String(spec.measure.uuid),
                        `Unexpected fixup for a measure ${op.p[0]} ` +
                            `other than the current ${spec.measure.uuid}`);
                    invariant(op.p[1] === "parts", "Expected p[1] to be parts");
                    invariant(op.p[2] === localSegment.part, `Expected part ${op.p[2]} to be ${localSegment.part}`);
                    if (localSegment.ownerType === OwnerType.Voice) {
                        if (typeof op.p[4] === "string") {
                            op.p[4] = parseInt(op.p[4] as string, 10);
                        }
                        invariant(op.p[3] === "voices", "We are in a voice, so we can only patch the voice");
                        invariant(op.p[4] === localSegment.owner, `Expected voice owner ${localSegment.owner}, got ${op.p[4]}`);
                        return op.p.length === 6 && (op.p[5] <= cursor$.idx$) || op.p[5] < cursor$.idx$;
                    } else if (localSegment.ownerType === OwnerType.Staff) {
                        invariant(op.p[3] === "staves", "We are in a staff, so we can only patch the staff");
                        invariant(op.p[4] === localSegment.owner, `Expected staff owner ${localSegment.owner}, got ${op.p[4]}`);
                        return op.p.length === 6 && (op.p[5] <= cursor$.idx$) || op.p[5] < cursor$.idx$;
                    }
                    invariant(false, `Invalid segment owner type ${localSegment.ownerType}`);
                });
                console.log("restart:", restartRequired);

                spec.fixup(localSegment, operations, restartRequired);
            },
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
                model.validate(cursor$);
            } else {
                layout = model.getLayout(cursor$);
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
                        cursor$.staff.totalDivisions, spec.measure.parent, cursor$.staff.attributes);
                }

                invariant(cursor$.staff.totalDivisions === gDivOverflow.maxDiv,
                        "Divisions are not consistent. Found %s but expected %s",
                        cursor$.staff.totalDivisions, gDivOverflow.maxDiv);
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
        for (let i = 0; i < voiceSegment.length; ++i) {
            const model = voiceSegment[i];

            const atEnd = i + 1 === voiceSegment.length;
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
                model.validate(cursor$);
            } else {
                layout = model.getLayout(cursor$);
                layout.part = part;
                (<any>layout).key = (<any>model).key;
            }
            cursor$.division$ += model.divCount;
            gMaxDivisions = Math.max(gMaxDivisions, cursor$.division$);

            if (cursor$.division$ > cursor$.staff.totalDivisions && !spec.preview) {
                // Note: unfortunate copy-pasta.
                if (!gDivOverflow) {
                    gDivOverflow = new DivisionOverflowException(
                        cursor$.staff.totalDivisions, spec.measure.parent, cursor$.staff.attributes);
                }

                invariant(cursor$.staff.totalDivisions === gDivOverflow.maxDiv,
                        "Divisions are not consistent. Found %s but expected %s",
                        cursor$.staff.totalDivisions, gDivOverflow.maxDiv);
                invariant(!!voiceSegment.part,
                    "Part must be defined -- is this spec from Engine.validate$?");
            }

            if (atEnd) {
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
            let lastAttribs = cursor$.staff.attributes;
            gSomeLastAttribs[voiceSegment.part][model.staffIdx] = lastAttribs;
            gPrint = cursor$.print$;
            gMaxXInMeasure = Math.max(cursor$.x$, gMaxXInMeasure);
            gMaxPaddingTopInMeasure$[model.staffIdx] = Math.max(
                cursor$.maxPaddingTop$[model.staffIdx],
                gMaxPaddingTopInMeasure$[model.staffIdx] || 0);
            gMaxPaddingBottomInMeasure$[model.staffIdx] = Math.max(
                cursor$.maxPaddingBottom$[model.staffIdx],
                gMaxPaddingBottomInMeasure$[model.staffIdx] || 0);
            segmentLayout$.push(layout);
        }

        lastPrint = spec.print;
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
        print: gPrint,
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
    document: IDocument;
    attributes: {[key: string]: IAttributesSnapshot[]};
    print: Print;
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
    fixup: (segment: ISegment, operations: IAny[], restartRequired: boolean) => void;

}

/**
 * Given the context and constraints given, creates a possible layout for items within a measure.
 *
 * @param opts structure with __normalized__ voices and staves
 * @returns an array of staff and voice layouts with an undefined order
 */
export function layoutMeasure(
        {
            document,
            header,
            print,
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
        document,
        attributes,
        factory,
        print,
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
