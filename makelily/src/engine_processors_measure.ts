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

/**
 * @file engine/processors/measure.ts provides functions for validating and laying out measures
 */

import * as invariant from "invariant";
import {IAny} from "musicxml-interfaces/operations";
import {ScoreHeader, Print} from "musicxml-interfaces";
import {keyBy, filter, map, reduce, values, flatten, forEach, some, last} from "lodash";

import {Document, IMeasure, ISegment, IModel, Type, ILayout} from "./document";

import {IAttributesSnapshot} from "./private_attributesSnapshot";
import {ICombinedLayout, mergeSegmentsInPlace} from "./private_combinedLayout";
import {ValidationCursor, LayoutCursor} from "./private_cursor";
import {IFactory} from "./private_factory";
import {IMeasureLayout} from "./private_measureLayout";
import {scoreParts} from "./private_part";
import {cloneObject} from "./private_util";
import {barDivisions, InvalidAccidental} from "./private_chordUtil";

import DivisionOverflowException from "./engine_divisionOverflowException";

export interface IMeasureLayoutOptions {
    document: Document;
    header: ScoreHeader;
    measure: IMeasure;
    print: Print;
    x: number;

    lineShortest: number;
    lineBarOnLine: number;
    lineTotalBarsOnLine: number;
    lineIndex: number;
    lineCount: number;

    factory: IFactory;
    preview: boolean;
    attributes: {[key: string]: IAttributesSnapshot[]};
    fixup: (segment: ISegment, operations: IAny[]) => void;
}

interface IStaffContext {
    attributes: IAttributesSnapshot;
    accidentals: {[key: string]: number};
    division: number;
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
export function refreshMeasure(spec: IRefreshMeasureOpts): IMeasureLayout {
    console.log("Refresh measure", spec.measure.number, RefreshMode[spec.mode]);
    const gMeasure = spec.measure;
    invariant(!!spec.attributes, "Attributes must be defined");
    const gInitialAttribs = cloneObject(spec.attributes);
    let gPrint: Print = spec.print;
    let gMaxDivisions = 0;
    if (!spec.document.cleanlinessTracking.measures[spec.measure.uuid]) {
        spec.document.cleanlinessTracking.measures[spec.measure.uuid] = {
            clean: null,
            x: {},
            layout: null,
        };
    }

    // Cleanliness is also part-owned by the line processor. The layout in
    // cleanliness is not the output of this function -- it also has been
    // treated by postprocessors. This function sets "x" and uses the clean-state
    // to avoid unnecessary work.
    let cleanliness = spec.document.cleanlinessTracking.measures[spec.measure.uuid];
    let oldLayout = cleanliness.layout;

    invariant(spec.segments.length >= 1, "_processMeasure expects at least one segment.");

    Object.keys(spec.measure.parts).forEach(part => {
        cleanliness.x[part] = cleanliness.x[part] || {};
        spec.measure.parts[part].voices.forEach(voice => {
            if (!voice) {
                return;
            }
            cleanliness.x[part][voice.owner] = cleanliness.x[part][voice.owner] || {
                voiceX: [],
                staffX: spec.measure.parts[part].staves.reduce((memo, staff) => {
                    if (staff) {
                        memo[staff.owner] = [];
                    }
                    return memo;
                }, {} as {[staff: number]: number[]}),
            };
        });
    });

    const gStaffMeasure: { [key: string]: ISegment } =
        keyBy(filter(spec.segments,
            seg => seg.ownerType === "staff"),
            seg => `${seg.part}_${seg.owner}`);

    const gVoiceMeasure: { [key: string]: ISegment } =
        keyBy(filter(spec.segments,
            seg => seg.ownerType === "voice"),
            seg => `${seg.part}_${seg.owner}`);

    const gStaffLayouts: { [key: string]: ILayout[][] } = {};

    let gMaxXInMeasure = spec.measureX;
    const gMaxPaddingTopInMeasure     = <number[]> [];
    const gMaxPaddingBottomInMeasure  = <number[]> [];

    let gDivOverflow: DivisionOverflowException = null;
    let lastPrint = spec.print;

    let vCursor: ValidationCursor;

    function fixup(operations: IAny[]) {
        const localSegment = vCursor.segmentInstance;
        const restartRequired = some(operations, op => {
            if (op.p[0] === "divisions") {
                return true;
            }

            invariant(String(op.p[0]) === String(spec.measure.uuid),
                `Unexpected fixup for a measure ${op.p[0]} ` +
                    `other than the current ${spec.measure.uuid}`);
            invariant(op.p[1] === "parts", "Expected p[1] to be parts");
            invariant(op.p[2] === localSegment.part, `Expected part ${op.p[2]} to be ${localSegment.part}`);
            if (localSegment.ownerType === "voice") {
                if (typeof op.p[4] === "string") {
                    op.p[4] = parseInt(op.p[4] as string, 10);
                }
                invariant(op.p[3] === "voices", "We are in a voice, so we can only patch the voice");
                invariant(op.p[4] === localSegment.owner, `Expected voice owner ${localSegment.owner}, got ${op.p[4]}`);
                return op.p.length === 6 && (op.p[5] <= vCursor.segmentPosition) || op.p[5] < vCursor.segmentPosition;
            } else if (localSegment.ownerType === "staff") {
                invariant(op.p[3] === "staves", "We are in a staff, so we can only patch the staff");
                invariant(op.p[4] === localSegment.owner, `Expected staff owner ${localSegment.owner}, got ${op.p[4]}`);
                return op.p.length === 6 && (op.p[5] <= vCursor.segmentPosition) || op.p[5] < vCursor.segmentPosition;
            }
            invariant(false, `Invalid segment owner type ${localSegment.ownerType}`);
        });

        spec.fixup(localSegment, operations, restartRequired);
    };

    const gVoiceLayouts = map(gVoiceMeasure, voiceSegment => {
        const {part} = voiceSegment;
        gInitialAttribs[part] = gInitialAttribs[part] || [];

        const voiceStaves: {[key: number]: ILayout[]}  = {};
        const staffContexts: {[key: number]: IStaffContext} = {};
        const xPerStaff: {[key: number]: number} = [];

        let measureIsLast = gMeasure.uuid === last(spec.document.measures).uuid;
        vCursor = new ValidationCursor({
            ...spec,
            measureInstance: gMeasure,
            measureIsLast,
            page: 1,
            print: lastPrint,
            segment: voiceSegment,
            staffAccidentals: {},
            staffAttributes: null,
            staffIdx: NaN,

            fixup,
        });
        const lCursor = new LayoutCursor({
            ...spec,
            validationCursor: vCursor,
            x: spec.measureX
        });

        /**
         * Processes a staff model within this voice's context.
         */
        function pushStaffSegment(staffIdx: number, model: IModel, catchUp: boolean) {
            if (!model) {
                staffContexts[staffIdx].division = vCursor.segmentDivision + 1;
                return;
            }
            const oldDivision = vCursor.segmentDivision;
            const oldSegment = vCursor.segmentInstance;
            const oldIdx = vCursor.segmentPosition;
            vCursor.segmentDivision = staffContexts[staffIdx].division;
            vCursor.staffAccidentals = staffContexts[staffIdx].accidentals;
            vCursor.staffAttributes = staffContexts[staffIdx].attributes;
            if (catchUp) {
                lCursor.segmentX = xPerStaff[staffIdx];
            }
            vCursor.segmentInstance = gStaffMeasure[`${part}_${staffIdx}`];
            vCursor.segmentPosition = voiceStaves[staffIdx].length;
            let layout: ILayout;
            model.key = `SATIE${vCursor.measureInstance.uuid}_parts_${vCursor.segmentInstance.part}_staves_${
                vCursor.segmentInstance.owner}_${vCursor.segmentPosition}`;

            model.staffIdx = vCursor.staffIdx;
            if (vCursor.factory.modelHasType(model, Type.Barline)) {
                const totalDivisions = barDivisions(vCursor.staffAttributes);
                const divsToAdvance = totalDivisions - vCursor.segmentDivision;
                if (divsToAdvance > 0) {
                    vCursor.advance(divsToAdvance);
                }
            }
            if (spec.mode === RefreshMode.RefreshModel) {
                model.refresh(vCursor.const());
            }
            if (vCursor.factory.modelHasType(model, Type.Attributes)) {
                vCursor.staffAttributes = model._snapshot;
            }
            if (vCursor.factory.modelHasType(model, Type.Print)) {
                vCursor.print = model;
            }
            if (spec.mode === RefreshMode.RefreshLayout) {
                layout = model.getLayout(lCursor);
                layout.part = part;
                layout.key = model.key;
                if (spec.preview) {
                    lCursor.segmentX = cleanliness.x[part][voiceSegment.owner].staffX[staffIdx][lCursor.segmentPosition];
                }

                cleanliness.x[part][voiceSegment.owner].staffX[staffIdx][lCursor.segmentPosition] = lCursor.segmentX;
            }
            invariant(isFinite(model.divCount), "%s should be a constant division count",
                    model.divCount);
            vCursor.segmentDivision += model.divCount;

            if (vCursor.staffAttributes) {
                const totalDivisions = barDivisions(vCursor.staffAttributes);
                if (vCursor.segmentDivision > totalDivisions && !!gDivOverflow) {
                    if (!gDivOverflow) {
                        gDivOverflow = new DivisionOverflowException(
                            totalDivisions, spec.measure, vCursor.staffAttributes);
                    }

                    invariant(totalDivisions === gDivOverflow.maxDiv,
                            "Divisions are not consistent. Found %s but expected %s",
                            totalDivisions, gDivOverflow.maxDiv);
                }
            } else {
                invariant(vCursor.segmentDivision === 0, "Expected attributes to be set on cursor");
            }

            staffContexts[staffIdx].division = vCursor.segmentDivision;
            staffContexts[staffIdx].accidentals = vCursor.staffAccidentals;
            staffContexts[staffIdx].attributes = vCursor.staffAttributes;
            xPerStaff[staffIdx] = lCursor.segmentX;
            vCursor.segmentDivision = oldDivision;
            vCursor.segmentInstance = oldSegment;
            vCursor.segmentPosition = oldIdx;

            if (spec.mode === RefreshMode.RefreshLayout) {
                invariant(!!layout, "%s must be a valid layout", layout);
            }
            voiceStaves[staffIdx].push(layout);
        }

        let segmentLayout: ILayout[] = [];
        for (let i = 0; i < voiceSegment.length; ++i) {
            const model = voiceSegment[i];

            const atEnd = i + 1 === voiceSegment.length;
            const staffIdx: number = model.staffIdx;
            invariant(isFinite(model.staffIdx), "%s must be finite", model.staffIdx);
            if (!lCursor.lineMaxPaddingTopByStaff[model.staffIdx]) {
                lCursor.lineMaxPaddingTopByStaff[model.staffIdx] = 0;
            }
            if (!lCursor.lineMaxPaddingBottomByStaff[model.staffIdx]) {
                lCursor.lineMaxPaddingBottomByStaff[model.staffIdx] = 0;
            }

            if (!staffContexts[staffIdx]) {
                staffContexts[staffIdx] = {
                    accidentals: {},
                    attributes: gInitialAttribs[part][staffIdx],
                    division: 0,
                };
            }

            // Create a voice-staff pair if needed. We'll later merge all the
            // voice staff pairs.
            if (!voiceStaves[staffIdx]) {
                voiceStaves[staffIdx] = [];
                gStaffLayouts[`${part}_${staffIdx}`] = gStaffLayouts[`${part}_${staffIdx}`] || [];
                gStaffLayouts[`${part}_${staffIdx}`].push(voiceStaves[staffIdx]);
                xPerStaff[staffIdx] = 0;
            }

            vCursor.segmentPosition = i;
            vCursor.staffAccidentals = staffContexts[staffIdx].accidentals;
            vCursor.staffAttributes = staffContexts[staffIdx].attributes;
            vCursor.staffIdx = staffIdx;

            while (staffContexts[staffIdx].division <= vCursor.segmentDivision) {
                let nextStaffEl = gStaffMeasure[`${part}_${staffIdx}`]
                    [voiceStaves[staffIdx].length];

                // We can mostly ignore priorities here, since except for one exception,
                // staff segments are more important than voice segments. The one exception
                // is barlines:
                let nextIsBarline = spec.factory.modelHasType(nextStaffEl, Type.Barline);
                if (nextIsBarline && staffContexts[staffIdx].division === vCursor.segmentDivision) {
                    break;
                }

                // Process a staff model within a voice context.
                let catchUp = staffContexts[staffIdx].division < vCursor.segmentDivision;
                pushStaffSegment(staffIdx, nextStaffEl, catchUp);
                invariant(isFinite(staffContexts[staffIdx].division), "divisionPerStaff is supposed " +
                    "to be a number, got %s", staffContexts[staffIdx].division);
            }

            // All layout that can be controlled by the model is done here.
            let layout: ILayout;
            model.key = `SATIE${vCursor.measureInstance.uuid}_parts_${vCursor.segmentInstance.part}_voices_${
                vCursor.segmentInstance.owner}_${vCursor.segmentPosition}`;
            model.staffIdx = vCursor.staffIdx;
            if (spec.mode === RefreshMode.RefreshModel) {
                model.refresh(vCursor.const());
            }
            if (vCursor.factory.modelHasType(model, Type.Chord)) {
                forEach(model, note => {
                    if (note.rest) {
                        return;
                    }
                    const pitch = note.pitch;
                    if (pitch.alter === 0) {
                        vCursor.staffAccidentals[pitch.step] = undefined;
                    }
                    vCursor.staffAccidentals[pitch.step + pitch.octave] = pitch.alter;
                    if ((vCursor.staffAccidentals[pitch.step]) !== pitch.alter) {
                        vCursor.staffAccidentals[pitch.step] = InvalidAccidental;
                    }
                });
            }
            if (spec.mode === RefreshMode.RefreshLayout) {
                layout = model.getLayout(lCursor);
                if (spec.preview) {
                    lCursor.segmentX = cleanliness.x[part][voiceSegment.owner].voiceX[lCursor.segmentPosition];
                }

                cleanliness.x[part][voiceSegment.owner].voiceX[lCursor.segmentPosition] = lCursor.segmentX;
                layout.part = part;
                layout.key = model.key;
            }
            vCursor.segmentDivision += model.divCount;
            gMaxDivisions = Math.max(gMaxDivisions, vCursor.segmentDivision);

            const totalDivisions = barDivisions(vCursor.staffAttributes);
            if (vCursor.segmentDivision > totalDivisions && !spec.preview) {
                // Note: unfortunate copy-pasta.
                if (!gDivOverflow) {
                    gDivOverflow = new DivisionOverflowException(
                        totalDivisions, spec.measure, vCursor.staffAttributes);
                }

                invariant(totalDivisions === gDivOverflow.maxDiv,
                        "Divisions are not consistent. Found %s but expected %s",
                        totalDivisions, gDivOverflow.maxDiv);
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

                    let voiceStaff = voiceStaves[nidx];
                    if (!!staff && !!voiceStaff) {
                        while (voiceStaff.length < staff.length) {
                            pushStaffSegment(nidx, staff[voiceStaff.length], false);
                        }
                    }
                });
            }
            const previousAttribs = vCursor.staffAttributes;
            gInitialAttribs[voiceSegment.part][model.staffIdx] = previousAttribs;
            gPrint = vCursor.print;
            gMaxXInMeasure = Math.max(lCursor.segmentX, gMaxXInMeasure);
            gMaxPaddingTopInMeasure[model.staffIdx] = Math.max(
                lCursor.lineMaxPaddingTopByStaff[model.staffIdx],
                gMaxPaddingTopInMeasure[model.staffIdx] || 0);
            gMaxPaddingBottomInMeasure[model.staffIdx] = Math.max(
                lCursor.lineMaxPaddingBottomByStaff[model.staffIdx],
                gMaxPaddingBottomInMeasure[model.staffIdx] || 0);
            segmentLayout.push(layout);
        }

        lastPrint = spec.print;
        return segmentLayout;
    });

    if (gDivOverflow) {
        throw gDivOverflow;
    }

    // Get an ideal voice layout for each voice-staff combination
    const gStaffLayoutsUnkeyed: ILayout[][][] = values(gStaffLayouts) as ILayout[][][];
    const gStaffLayoutsCombined: ILayout[][] = flatten(gStaffLayoutsUnkeyed);

    // Create a layout that satisfies the constraints in every single voice.
    // IModel.mergeSegmentsInPlace requires two passes to fully merge the layouts.
    // We do the second pass once we filter unneeded staff segments.
    const gAllLayouts = gStaffLayoutsCombined.concat(gVoiceLayouts);

    // We have a staff layout for every single voice-staff combination.
    // They will be merged, so it doesn't matter which one we pick.
    // Pick the first.
    const gStaffLayoutsUnique = map(gStaffLayoutsUnkeyed, layouts => layouts[0]);

    if (!spec.noAlign) {
        // Calculate and finish applying the master layout.
        // Two passes is always sufficient.
        let masterLayout = reduce(gAllLayouts, mergeSegmentsInPlace, []);
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
        reduce(gVoiceLayouts, mergeSegmentsInPlace, masterLayout);

        // Merge in the staves
        reduce(gStaffLayoutsUnique, mergeSegmentsInPlace, masterLayout);
    }

    const gPadding = gMaxXInMeasure === spec.measureX || spec.lineBarOnLine + 1 === spec.lineTotalBarsOnLine ? 0 : 15;

    let newLayout: IMeasureLayout;
    if (spec.mode === RefreshMode.RefreshLayout && spec.preview) {
        newLayout = {
            attributes: oldLayout.attributes,
            print: oldLayout.print,
            elements: oldLayout.elements,
            width: oldLayout.width,
            maxDivisions: oldLayout.maxDivisions,
            originX: spec.measureX,
            originY: {},
            paddingTop: oldLayout.paddingTop,
            paddingBottom: oldLayout.paddingBottom,
            getVersion: () => gMeasure.version,
            uuid: gMeasure.uuid,
        };
    } else {
        newLayout = {
            attributes: gInitialAttribs,
            print: gPrint,
            elements: gStaffLayoutsUnique.concat(gVoiceLayouts),
            width: gMaxXInMeasure + gPadding - spec.measureX,
            maxDivisions: gMaxDivisions,
            originX: spec.measureX,
            originY: {},
            paddingTop: gMaxPaddingTopInMeasure,
            paddingBottom: gMaxPaddingBottomInMeasure,
            getVersion: () => gMeasure.version,
            uuid: gMeasure.uuid,
        };
    }

    if (spec.mode === RefreshMode.RefreshLayout && !spec.preview) {
        cleanliness.clean = newLayout;
    }

    return newLayout;
}

interface ISpreadMemo {
    prevDivision: number;
    min: number;
}

export enum RefreshMode {
    RefreshModel,
    RefreshLayout,
};

export interface IRefreshMeasureOpts {
    document: Document;
    print: Print;
    factory: IFactory;
    header: ScoreHeader;
    measure: IMeasure;
    measureX: number;
    segments: ISegment[];

    attributes: {[part: string]: IAttributesSnapshot[]};

    lineShortest: number;
    lineBarOnLine: number;
    lineTotalBarsOnLine: number;
    lineIndex: number;
    lineCount: number;

    noAlign?: boolean;
    mode: RefreshMode;
    preview: boolean;
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
            factory,
            x,
            preview,
            fixup,
            lineShortest,
            lineBarOnLine,
            lineTotalBarsOnLine,
            lineIndex,
            lineCount,
            attributes,
        }: IMeasureLayoutOptions): IMeasureLayout {

    const parts = map(scoreParts(header.partList), part => part.id);
    const staves = flatten(map(parts, partId => measure.parts[partId].staves)) as ISegment[];
    const voices = flatten(map(parts, partId => measure.parts[partId].voices)) as ISegment[];

    const segments = filter(voices.concat(staves), s => !!s);

    const status = refreshMeasure({
        document,
        factory,
        print,
        header,
        measure: measure,
        measureX: x,
        segments,
        lineShortest,
        lineBarOnLine,
        lineTotalBarsOnLine,
        lineIndex,
        lineCount,
        mode: RefreshMode.RefreshLayout,

        preview,
        fixup,
        attributes,
    });

    return status;
}
