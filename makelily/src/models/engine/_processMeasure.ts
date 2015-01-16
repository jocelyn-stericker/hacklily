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
 * @file engine/_processMeasure.ts provides function for validating or laying out a measure
 */

"use strict";

import _                = require("lodash");
import invariant        = require("react/lib/invariant");

import Measure          = require("./measure");
import ICursor          = require("./icursor");
import IModel           = require("./imodel");
import Ctx              = require("./ctx");

/**
 * Given a cursor skeleton, creates a detached mutable cursor.
 * 
 * For use by _processMeasure.
 */
function createCursor(
        spec: {
            segment: Measure.ISegment;
            voice: Ctx.IVoice;
            staff: Ctx.IStaff;
            measure: Ctx.IMeasure;
            line: Ctx.ILine;
            prev: IModel;
            x: number;
            _approximate: boolean;
            _detached: boolean;
            factory: IModel.IFactory;
        }): ICursor {
    return {
        segment: spec.segment,
        idx$: 0,
        line: spec.line,
        print$: null,
        header: null,
        measure: spec.measure,
        staff: Ctx.IStaff.detach(spec.staff),
        voice: spec.voice,
        prev$: spec.prev,
        division$: 0,
        x$: spec.x,
        maxPaddingBottom$: 0,
        maxPaddingTop$: 0,
        approximate: spec._approximate,
        detached: spec._detached,
        factory: spec.factory
    };
}

/** 
 * Given a bunch of segments and the context (measure, line), returns information needed to lay the
 * models out. Note that the order of the output is arbitrary and may not correspond to the order
 * of the input segments.
 * 
 * @segments Models to lay out.
 * @measure Model to which the model belongs to.
 * @line Line context
 * 
 * Complexity: O(staff-voice pairs)
 */
function _processMeasure(spec: _processMeasure.ILayoutOpts): Measure.IMeasureLayout {
    var segments        = spec.segments;
    var line            = spec.line;
    var measure         = spec.measure;
    var prevByStaff     = spec.prevByStaff;
    var validateOnly    = spec._validateOnly;

    invariant(segments.length > 1, "_processMeasure expects at least one segment.");

    var divisions       = segments[1].staffSegment ?
                            segments[1].staffSegment.attributes.divisions :
                            segments[1].voiceSegment.divisions;

    invariant(_.all(segments,
        seg => !seg || divisions === (seg.staffSegment ?
            seg.staffSegment.attributes.divisions :
            seg.voiceSegment.divisions)),
        "_processMeasure(...) expects all segments to have the same 'divisions' variable. \n" +
        "Use Measure.normalizeDivisions$(segments) to accomplish this.");

    var staffMeasure               = _.indexBy(_.filter(segments, (seg: Measure.ISegmentRef) => seg && seg.staffSegment), "owner");
    var voiceMeasure               = _.filter(segments, (seg) => seg && seg.voiceSegment);

    var staffLayouts$: { [key: number]: IModel.ILayout[][] } = {};

    var maxXInMeasure               = 0;
    var maxPaddingTopInMeasure$     = 0;
    var maxPaddingBottomInMeasure$  = 0;

    var voiceLayouts$   = _.map(voiceMeasure, segmentRef => {
        var voice                                                   = <Ctx.IVoice> {};

        var voiceStaves$:        {[key: number]: IModel.ILayout[]}  = {};
        var staffContexts$:      {[key: number]: Ctx.IStaff}        = {};
        var divisionPerStaff$:   {[key: string]: number}            = {};

        var cursor$ = createCursor({
            segment:        segmentRef.voiceSegment,
            idx$:           0,

            voice:          voice,
            staff:          null,
            measure:        measure,
            line:           line,

            prev:           prevByStaff ? prevByStaff[0] : null, // FIXME!
            division$:      0,
            x:              measure.x,

            _approximate:   spec._approximate,
            _detached:      spec._detached,
            factory:        spec.factory
        });

        function pushStaffSegment(staffIdx: number, model: IModel) {
            var oldDivision                 = cursor$.division$;
            cursor$.division$               = divisionPerStaff$[staffIdx];
            var layout: IModel.ILayout;
            if (validateOnly) {
                model.staffIdx = cursor$.staff.idx;
                model.validate$(cursor$);
            } else {
                layout                      = model.layout(cursor$);
            }
            cursor$.division$ += model.divCount;
            divisionPerStaff$[staffIdx]     = cursor$.division$;
            cursor$.division$               = oldDivision;
            cursor$.prev$                   = model;

            voiceStaves$[staffIdx].push(layout);
        }

        return _.map(segmentRef.voiceSegment.models, (model, idx, list) => {
            var atEnd = idx + 1 === list.length;
            var staffIdx: number = model.staffIdx;
            invariant(isFinite(model.staffIdx), "%s is not finite", model.staffIdx);

            // Create a voice-staff pair if needed. We'll later merge all the
            // voice staff pairs.
            if (!voiceStaves$[staffIdx]) {
                voiceStaves$[staffIdx] = [];
                staffContexts$[staffIdx] = {
                    accidentals$: {},
                    attributes: null,
                    totalDivisions: NaN,
                    previous: null,
                    idx: staffIdx
                };

                staffLayouts$[staffIdx] = staffLayouts$[staffIdx] || [];
                staffLayouts$[staffIdx].push(voiceStaves$[staffIdx]);
                divisionPerStaff$[staffIdx] = 0;
            }

            cursor$.staff = staffContexts$[staffIdx];

            do {
                if (divisionPerStaff$[staffIdx] <= cursor$.division$) {
                    var nextStaffEl = staffMeasure[staffIdx].staffSegment.models[voiceStaves$[staffIdx].length];
                    pushStaffSegment(staffIdx, nextStaffEl);
                } else {
                    break;
                }
            } while (true);

            // All layout that can be controlled by the model is done here.
            var layout: IModel.ILayout;
            if (validateOnly) {
                model.staffIdx = cursor$.staff.idx;
                model.validate$(cursor$);
            } else {
                layout = model.layout(cursor$);
            }
            cursor$.division$ += model.divCount;
            cursor$.prev$ = model;

            if (atEnd) {
                _.forEach(staffMeasure,(staff, idx) => {
                    var voiceStaff = voiceStaves$[<any>idx];
                    while (!!staff && !!voiceStaff && voiceStaves$[<any>idx].length < staff.staffSegment.models.length) {
                        pushStaffSegment(parseInt(idx, 10), staff.staffSegment.models[voiceStaves$[<any> idx].length]);
                    }
                });
            }
            maxXInMeasure = Math.max(cursor$.x$, maxXInMeasure);
            maxPaddingTopInMeasure$ = Math.max(cursor$.maxPaddingTop$, maxPaddingTopInMeasure$);
            maxPaddingBottomInMeasure$ = Math.max(cursor$.maxPaddingBottom$, maxPaddingBottomInMeasure$);
            return layout;
        });
    });

    // Get an ideal voice layout for each voice-staff combination
    var staffLayoutsUnkeyed$: IModel.ILayout[][][] = _.values(staffLayouts$);
    var staffLayoutsCombined: IModel.ILayout[][] = <any> _.flatten(staffLayoutsUnkeyed$);

    // Create a layout that satisfies the constraints in every single voice.
    // IModel.merge$ requires two passes to fully merge the layouts. We do the second pass
    // once we filter unneeded staff segments.
    var allLayouts$ = voiceLayouts$.concat(staffLayoutsCombined);

    // We have a staff layout for every single voice-staff combination.
    // They will be merged, so it doesn't matter which one we pick.
    // Pick the first.
    var staffLayoutsUnique$ = _.map(staffLayoutsUnkeyed$, layouts => layouts[0]);

    if (!spec._noAlign) {
        // Calculate and finish applying the master layout
        var masterLayout = _.reduce(allLayouts$, IModel.merge$, []);
        _.reduce(voiceLayouts$, IModel.merge$, masterLayout);

        // Merge in the staves
        _.reduce(staffLayoutsUnique$, IModel.merge$, masterLayout);
    }

    return {
        elements: voiceLayouts$.concat(staffLayoutsUnique$),
        width: maxXInMeasure - measure.x,
        paddingTop: maxPaddingTopInMeasure$,
        paddingBottom: maxPaddingBottomInMeasure$
    };
}

module _processMeasure {
    export interface ILayoutOpts {
        segments: Measure.ISegmentRef[];
        measure: Ctx.IMeasure;
        line: Ctx.ILine;
        prevByStaff: IModel[];
        factory: IModel.IFactory;

        _noAlign?: boolean;
        _approximate?: boolean;
        _detached?: boolean;
        _validateOnly?: boolean;
    }
}

export = _processMeasure;
