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
 * @file engine/measureProcessor.ts provides function for validating or laying out a measure
 */

"use strict";

import MusicXML         = require("musicxml-interfaces");
import _                = require("lodash");
import invariant        = require("react/lib/invariant");

import Measure          = require("./measure");
import ICursor          = require("./icursor");
import IModel           = require("./imodel");
import Ctx              = require("./ctx");

export let MAX_SAFE_INTEGER = 9007199254740991;

/**
 * Assigns a random key to an object, usually for React.
 */
export function key$(t$: any) {
    if (!t$.key) {
        t$.key = Math.floor(Math.random() * MAX_SAFE_INTEGER);
    }
}

export interface IMeasureLayoutOptions {
    attributes:     MusicXML.Attributes;
    header:         MusicXML.ScoreHeader;
    line:           Ctx.ILine;
    measure:        Measure.IMutableMeasure;
    prevByStaff:    IModel[];
    /** Starts at 0. */
    x:              number;

    /** @private approximate minimum width is being calculated */
    _approximate?:  boolean;

    /** @private does not have own attributes (true if approximate or grace notes) */
    _detached?:     boolean;

    padEnd?:        boolean;

    factory:        IModel.IFactory;
}

/**
 * Given a cursor skeleton, creates a detached mutable cursor.
 * 
 * For use by MeasureProcessor.
 */
function createCursor(
        spec: {
            _approximate:   boolean;
            _detached:      boolean;
            factory:        IModel.IFactory;
            header:         MusicXML.ScoreHeader,
            line:           Ctx.ILine;
            measure:        Ctx.IMeasure;
            prev:           IModel;
            segment:        Measure.ISegment;
            staff:          Ctx.IStaff;
            voice:          Ctx.IVoice;
            x:              number;
            page:           number;
        }): ICursor {
    return {
        approximate:        spec._approximate,
        detached:           spec._detached,
        division$:          0,
        factory:            spec.factory,
        header:             spec.header,
        idx$:               0,
        line:               spec.line,
        maxPaddingBottom$:  [],
        maxPaddingTop$:     [],
        measure:            spec.measure,
        prev$:              spec.prev,
        print$:             null,
        segment:            spec.segment,
        staff:              Ctx.IStaff.detach(spec.staff),
        voice:              spec.voice,
        x$:                 spec.x,
        page$:              spec.page
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
export function reduce(spec: ILayoutOpts): Measure.IMeasureLayout {
    let gLine                       = spec.line;
    let gMeasure                    = spec.measure;
    let gPrevByStaff                = spec.prevByStaff;
    let gValidateOnly               = spec._validateOnly;
    let gSomeLastAttribs            = <MusicXML.Attributes> null;
    let gMaxDivisions               = 0;

    invariant(spec.segments.length >= 1, "_processMeasure expects at least one segment.");

    let gStaffMeasure: { [key:string]: Measure.ISegment } =
        _.indexBy(_.filter(spec.segments,
            seg => seg.ownerType === Measure.OwnerType.Staff),
            seg => `${seg.part}_${seg.owner}`);

    let gVoiceMeasure: { [key:string]: Measure.ISegment } =
        _.indexBy(_.filter(spec.segments,
            seg => seg.ownerType === Measure.OwnerType.Voice),
            seg => `${seg.part}_${seg.owner}`);

    let gStaffLayouts$: { [key: string]: IModel.ILayout[][] } = {};

    let gMaxXInMeasure               = 0;
    let gMaxPaddingTopInMeasure$     = <number[]> [];
    let gMaxPaddingBottomInMeasure$  = <number[]> [];

    let gDivOverflow: DivisionOverflowException = null;

    let gVoiceLayouts$ = _.map(gVoiceMeasure, segment => {
        let lastAttribs                                             = spec.attributes;
        let voice                                                   = <Ctx.IVoice> {};
        let part                                                    = segment.part;

        let voiceStaves$:        {[key: number]: IModel.ILayout[]}  = {};
        let staffContexts$:      {[key: number]: Ctx.IStaff}        = {};
        let divisionPerStaff$:   {[key: string]: number}            = {};

        let cursor$ = createCursor({
            segment:        segment,
            idx$:           0,

            voice:          voice,
            staff:          null,
            measure:        gMeasure,
            line:           gLine,
            header:         spec.header,

            prev:           gPrevByStaff ? gPrevByStaff[0] : null, // FIXME!
            division$:      0,
            x:              gMeasure.x,

            page:           spec._approximate ? NaN : 1,

            _approximate:   spec._approximate,
            _detached:      spec._detached,
            factory:        spec.factory
        });

        /**
         * Processes a staff model within this voice's context.
         */
        function pushStaffSegment(staffIdx: number, model: IModel) {
            if (!model) {
                divisionPerStaff$[staffIdx] = cursor$.division$ + 1;
                return;
            }
            let oldDivision                 = cursor$.division$;
            let oldSegment                  = cursor$.segment;
            let oldIdx                      = cursor$.idx$;
            cursor$.division$               = divisionPerStaff$[staffIdx];
            cursor$.segment                 = gStaffMeasure[`${part}_${staffIdx}`];
            cursor$.idx$                    = voiceStaves$[staffIdx].length;
            let layout: IModel.ILayout;
            key$(model);
            if (gValidateOnly) {
                model.staffIdx = cursor$.staff.idx;
                model.validate$(cursor$);
            } else {
                layout                      = model.layout(cursor$);
                (<any>layout).key           = (<any>model).key;
            }
            invariant(isFinite(model.divCount), "%s should be a constant division count",
                    model.divCount);
            cursor$.division$               += model.divCount;

            if (cursor$.division$ > cursor$.staff.totalDivisions && !!gDivOverflow) {
                // Note: unfortunate copy-pasta.
                if (!gDivOverflow) {
                    gDivOverflow = new DivisionOverflowException(cursor$.staff.totalDivisions, spec.measure.parent);
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
                    let nv = newStaves[staffIdx] = <any> [];
                    let ov = oldStaves[staffIdx] = <any> cursor$.segment.slice(0, voiceStaves$[staffIdx].length + 1);

                    ov.owner     = nv.owner     = staffIdx;
                    ov.ownerType = nv.ownerType = Measure.OwnerType.Staff;
                    ov.divisions = nv.divisions = cursor$.segment.divisions;
                    ov.part      = nv.part      = cursor$.segment.part;
                    invariant(ov[ov.length - 1] === model, "tx");
                } else {
                    let divOffset = cursor$.division$ - cursor$.staff.totalDivisions - _.reduce(newStaves[staffIdx],
                            (sum, model) => sum + model.divCount, 0);
                    if (divOffset > 0) {
                        let spacer = spec.factory.create(IModel.Type.Spacer);
                        spacer.divCount = divOffset;
                        newStaves[staffIdx].push(spacer);
                    }
                    newStaves[staffIdx].push(model);
                }
            }

            divisionPerStaff$[staffIdx]     = cursor$.division$;
            cursor$.division$               = oldDivision;
            cursor$.prev$                   = model;
            cursor$.segment                 = oldSegment;
            cursor$.idx$                    = oldIdx;

            if (!gValidateOnly) {
                invariant(!!layout, "%s must be a valid layout", layout);
            }
            voiceStaves$[staffIdx].push(layout);
        }

        return _.map(segment, (model, idx, list) => {
            let atEnd = idx + 1 === list.length;
            let staffIdx: number = model.staffIdx;
            invariant(isFinite(model.staffIdx), "%s is not finite", model.staffIdx);
            cursor$.maxPaddingTop$[model.staffIdx] = cursor$.maxPaddingTop$[model.staffIdx] || 0;
            cursor$.maxPaddingBottom$[model.staffIdx] = cursor$.maxPaddingBottom$[model.staffIdx] || 0;

            // Create a voice-staff pair if needed. We'll later merge all the
            // voice staff pairs.
            if (!voiceStaves$[staffIdx]) {
                voiceStaves$[staffIdx] = [];
                staffContexts$[staffIdx] = {
                    accidentals$:       {},
                    attributes:         spec.attributes,
                    totalDivisions:     NaN,
                    previous:           null,
                    idx:                staffIdx
                };

                gStaffLayouts$[`${part}_${staffIdx}`] = gStaffLayouts$[`${part}_${staffIdx}`] || [];
                gStaffLayouts$[`${part}_${staffIdx}`].push(voiceStaves$[staffIdx]);
                divisionPerStaff$[staffIdx] = 0;
            }

            cursor$.idx$ = idx;
            cursor$.staff = staffContexts$[staffIdx];

            while (divisionPerStaff$[staffIdx] <= cursor$.division$) {
                let nextStaffEl = gStaffMeasure[`${part}_${staffIdx}`]
                    [voiceStaves$[staffIdx].length];

                // We can mostly ignore priorities here, since except for one exception,
                // staff segments are more important than voice segments. The one exception
                // is barlines:
                if (spec.factory.modelHasType(nextStaffEl, IModel.Type.Barline) && divisionPerStaff$[staffIdx] === cursor$.division$) {
                    break;
                }

                // Process a staff model within a voice context.
                pushStaffSegment(staffIdx, nextStaffEl);
                invariant(isFinite(divisionPerStaff$[staffIdx]), "divisionPerStaff$ is supposed " +
                    "to be a number, got %s", divisionPerStaff$[staffIdx]);
            }

            // All layout that can be controlled by the model is done here.
            let layout: IModel.ILayout;
            key$(model);
            if (gValidateOnly) {
                model.staffIdx              = cursor$.staff.idx;
                model.validate$(cursor$);
            } else {
                layout                      = model.layout(cursor$);
                (<any>layout).key           = (<any>model).key;
            }
            cursor$.division$ += model.divCount;
            gMaxDivisions = Math.max(gMaxDivisions, cursor$.division$);

            if (cursor$.division$ > cursor$.staff.totalDivisions) {
                // Note: unfortunate copy-pasta.
                if (!gDivOverflow) {
                    gDivOverflow = new DivisionOverflowException(cursor$.staff.totalDivisions, spec.measure.parent);
                }

                invariant(cursor$.staff.totalDivisions === gDivOverflow.maxDiv,
                        "Divisions are not consistent. Found %s but expected %s",
                        cursor$.staff.totalDivisions, gDivOverflow.maxDiv);
                invariant(!!segment.part, "Part must be defined -- is this spec from Engine.validate$?");

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

                    ov.owner     = nv.owner     = cursor$.segment.owner;
                    ov.ownerType = nv.ownerType = Measure.OwnerType.Voice;
                    ov.divisions = nv.divisions = cursor$.segment.divisions;
                    ov.part      = nv.part      = cursor$.segment.part;
                }

                newVoices[segment.owner].push(model);
            }

            cursor$.prev$ = model;

            if (atEnd) {
                _.forEach(gStaffMeasure, (staff, idx) => {
                    const pIdx = idx.lastIndexOf("_");
                    const staffMeasurePart = idx.substr(0, pIdx);
                    if (staffMeasurePart !== part) {
                        return;
                    }
                    const nidx = parseInt(idx.substr(pIdx + 1), 10);

                    let voiceStaff = voiceStaves$[<any>nidx];
                    while (!!staff && !!voiceStaff && voiceStaves$[<any>nidx].length < staff.length) {
                        pushStaffSegment(nidx, staff[voiceStaves$[<any> nidx].length]);
                    }
                });
            }
            lastAttribs                 = cursor$.staff.attributes;
            gSomeLastAttribs            = lastAttribs || lastAttribs;
            gMaxXInMeasure              = Math.max(cursor$.x$, gMaxXInMeasure);
            gMaxPaddingTopInMeasure$[model.staffIdx] = Math.max(
                cursor$.maxPaddingTop$[model.staffIdx],
                gMaxPaddingTopInMeasure$[model.staffIdx]||0);
            gMaxPaddingBottomInMeasure$[model.staffIdx] = Math.max(
                cursor$.maxPaddingBottom$[model.staffIdx],
                gMaxPaddingBottomInMeasure$[model.staffIdx]||0);
            return layout;
        });
    });

    if (gDivOverflow) {
        throw gDivOverflow;
    }

    // Get an ideal voice layout for each voice-staff combination
    let gStaffLayoutsUnkeyed$: IModel.ILayout[][][] = _.values(gStaffLayouts$);
    let gStaffLayoutsCombined: IModel.ILayout[][] = <any> _.flatten(gStaffLayoutsUnkeyed$);

    // Create a layout that satisfies the constraints in every single voice.
    // IModel.merge$ requires two passes to fully merge the layouts. We do the second pass
    // once we filter unneeded staff segments.
    let gAllLayouts$ = gVoiceLayouts$.concat(gStaffLayoutsCombined);

    // We have a staff layout for every single voice-staff combination.
    // They will be merged, so it doesn't matter which one we pick.
    // Pick the first.
    let gStaffLayoutsUnique$ = _.map(gStaffLayoutsUnkeyed$, layouts => layouts[0]);

    if (!spec._noAlign) {
        // Calculate and finish applying the master layout.
        // Two passes is always sufficient.
        let masterLayout = _.reduce(gAllLayouts$, IModel.merge$, []);
        _.reduce(gVoiceLayouts$, IModel.merge$, masterLayout);

        // Merge in the staves
        _.reduce(gStaffLayoutsUnique$, IModel.merge$, masterLayout);
    }

    let gPadding: number;

    if (gMaxXInMeasure === gMeasure.x || !spec.padEnd) {
        gPadding = 0;
    } else {
        gPadding = 15;
    }

    return {
        attributes:     gSomeLastAttribs,
        elements:       gVoiceLayouts$.concat(gStaffLayoutsUnique$),
        width:          gMaxXInMeasure + gPadding - gMeasure.x,
        maxDivisions:   gMaxDivisions,
        originX:        gMeasure.x,
        originY:        [],
        paddingTop:     gMaxPaddingTopInMeasure$,
        paddingBottom:  gMaxPaddingBottomInMeasure$
    };
}

export interface ILayoutOpts {
    attributes:     MusicXML.Attributes;
    factory:        IModel.IFactory;
    header:         MusicXML.ScoreHeader;
    line:           Ctx.ILine;
    measure:        Ctx.IMeasure;
    prevByStaff:    IModel[];
    segments:       Measure.ISegment[];

    _noAlign?:      boolean;
    _approximate?:  boolean;
    _detached?:     boolean;
    _validateOnly?: boolean;
    padEnd:         boolean;
}

/** 
 * Given the context and constraints given, creates a possible layout for items within a measure.
 * 
 * @param opts structure with __normalized__ voices and staves
 * @returns an array of staff and voice layouts with an undefined order
 */
export function layoutMeasure(opts: IMeasureLayoutOptions): Measure.IMeasureLayout {
    let measureCtx = Ctx.IMeasure.detach(opts.measure, opts.x);

    let voices = <Measure.ISegment[]> _.flatten(_.map(_.values(opts.measure.parts), part => part.voices));
    let staves = <Measure.ISegment[]> _.flatten(_.map(_.values(opts.measure.parts), part => part.staves));

    let segments = _.filter(voices.concat(staves), s => !!s);

    let line = opts.line;
    
    return reduce({
        attributes:     opts.attributes,
        factory:        opts.factory,
        header:         opts.header,
        line:           line,
        measure:        measureCtx,
        prevByStaff:    opts.prevByStaff,
        segments:       segments,
        padEnd:         opts.padEnd,

        _approximate:   opts._approximate,
        _detached:      opts._detached
    });
}

/** 
 * Given the context and constraints given, estimates a width. These widths do not
 * 
 * @param opts structure with __normalized__ voices and staves
 * @returns an approximate width for a measure that is not the first on a line.
 */
export function approximateWidth(opts: IMeasureLayoutOptions): number {
    invariant(isNaN(opts.measure.width) || opts.measure.width === null,
        "Engine.approximateWidth(...) must be passed a measure without an exact width.\n" +
        "Instead, it was passed a measure with opts.measure.width === %s.\n" +
        "This most likely means a measure was modified in a way that requires an updated " +
        "layout, but its \"FrozenEngraved\" status was not cleared.", opts.measure.width);

    invariant(!!opts.line, "An approximate line needs to be given to approximateWidth");

    opts = <IMeasureLayoutOptions> _.extend({
            _approximate: true,
            _detached: true
        }, opts);
    let layout = layoutMeasure(opts);
    return layout.width;
}

export declare class Error {
    constructor();
    message: string;
    stack: any;
}

export class DivisionOverflowException extends Error {
    constructor(maxDiv: number, measure: Measure.IMutableMeasure) {
        super();
        this.measureIdx     = measure.idx;
        this.message        = `DivisionOverflowException: max division should be ${maxDiv} in measure ${this.measureIdx}`;
        this.stack          = (new Error).stack;
        this.maxDiv         = maxDiv;
        this.oldParts       = measure.parts;
    }

    resolve$(measures$: Measure.IMutableMeasure[]) {
        let oldMeasure$ = measures$[this.measureIdx];

        _.forEach(this.oldParts, (part, partID) => {
            _.forEach(part.staves, (staff, staffIdx) => {
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
            idx:                this.measureIdx + 1,
            uuid:               Math.floor(Math.random() * MAX_SAFE_INTEGER),
            number:             "" + (parseInt(oldMeasure$.number, 10) + 1),
            implicit:           false,
            width:              NaN,
            nonControlling:     false,
            parts:              this.newParts
        };

        oldMeasure$.parts = this.oldParts;
        measures$.splice(this.measureIdx + 1, 0, newMeasure);
    }

    maxDiv:             number;
    oldParts: {
        [id: string]:   Measure.IMeasurePart;
    };
    newParts: {
        [id: string]:   Measure.IMeasurePart;
    } = {};

    measureIdx:         number;
}
