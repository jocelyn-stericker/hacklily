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
 * @file Tools for creating, validating, and laying out models.
 * 
 * Render Flow
 * ===========
 * 
 * De-serialization (JSON -> "UNVALIDATED")
 * ----------------------------------------
 *   0. MusicXML is converted to MXMLJSON via musicxml-interfaces
 *   1. MXMLJSON model is de-serialized                             (IModel.parse)
 *   2. IModel creates helper components, turns POD into     (IModel.modelDidLoad)
 *      classes
 * 
 * Validation ("UNVALIDATED" -> "VALIDATED")
 * -----------------------------------------
 *   3. Dependencies are created & errors fixed                 (IModel.validate$)
 *   4. Layout is guessed within a bar, voice, and staff           (IModel.layout)
 * 
 *          Models should pretend there is only one voice and one
 *          staff. The engine handles merging voices and staffs,
 *          as well as complex notation involving one voice across
 *          multiple staves.
 * 
 *          Layouts for VALIDATED and RENDERED models are memoized,
 *          so that neither validate$ layout need to be called on
 *          Models when a change happens that does not affect it.
 * 
 * Lay-out ("VALIDATED" -> "RENDERED")
 * -----------------------------------
 *   5. Context gets assigned a page and line based on guess      (Engine.layout$)
 *   6. Actual layout created                                      (IModel.layout)
 *   7. Layout is justified
 *   8. Elements outside of staff are positioned
 * 
 * 
 * Editing Flow
 * ============
 * 
 * Editing ("RENDERED" -> "UNVALIDATED")
 * -------------------------------------
 *   When any element in a measure is added, removed, or modified, all items in that
 *   measure go from the RENDERED state to the UNVALIDATED state.
 * 
 *   Note: some changes are done without changing the context model or layout
 *   model state. These changes are made with {dangerous: true}, and are used
 *   to provide constant time previews in Ripieno.
 * 
 * Line switches ("RENDERED" -> "VALIDATED")
 * -----------------------------------------
 *   When a measure is moved from one line to another, all models in the two lines
 *   that are RENDERED become VALIDATED. This implies that models must remain CLEAN
 *   when switching lines, and CLEAN Models must not mutate based on what else is on
 *   the same line, but not the same measure, as it. Instead, this information must
 *   be kept in IModel.layout. This constraint ensures linear time updates on the
 *   number of models on lines modified and promotes robustness.
 * 
 *   Keep in mind:
 *     - Every measure must have a valid Attributes which can be unhidden
 *       (via its ILayout!) if it becomes the first in a line.
 *     - Every measure must also have a valid warning Clef at the end which can be
 *       unhidden via ILayout.
 *     - Concerns related to accidentals and the vertical position of notes in a
 *       staff must be done in layout without changes to the Model.
 */

"use strict";

import MusicXML                 = require("musicxml-interfaces");
import _                        = require("lodash");
import invariant                = require("react/lib/invariant");

export import Ctx               = require("./engine/ctx");
export import IChord            = require("./engine/ichord");
export import ICursor           = require("./engine/icursor");
export import IModel            = require("./engine/imodel");
export import Measure           = require("./engine/measure");
export import Options           = require("./engine/options");
export import RenderUtil        = require("./engine/renderUtil");
export import ScoreHeader       = require("./engine/scoreHeader");
export import Util              = require("./engine/util");

import _processMeasure          = require("./engine/_processMeasure");

if (process.env.NODE_ENV !== "production") {
    /* tslint:disable */
    require("source-map-support").install();
    /* tslint:enable */
}

/*---- Engine -----------------------------------------------------------------------------------*/

/**
 * Staves, voices, and voices are all distinct concepts. A part is usually one instrument.
 * There is a one-to-many relation between parts and voices, as well as between parts and
 * staves. Staves of a single part are grouped together.
 */
export interface IPart {
    /**
     * Id of corresponding part in header. This contains information about how the part is rendered.
     */
    id:                         string;

    /**
     * The voices this part owns.
     */
    voices:                     number[];

    /**
     * The staves this part owns.
     */
    staves:                     number[];
};

export interface IMeasureLayoutOptions {
    measure: Measure.IMutableMeasure;
    prevByStaff: IModel[];

    /** Starts at 0. */
    x: number;

    line: Ctx.ILine;

    /** @private approximate minimum width is being calculated */
    _approximate?: boolean;

    /** @private does not have own attributes (true if approximate or grace notes) */
    _detached?: boolean;

    factory: IModel.IFactory;
}

/** 
 * Given the context and constraints given, creates a possible layout for items within a measure.
 * 
 * @param opts structure with __normalized__ voices and staves
 * @returns an array of staff and voice layouts with an undefined order
 */
export function layoutMeasure(opts: IMeasureLayoutOptions): Measure.IMeasureLayout {
    let measureCtx = Ctx.IMeasure.detach(opts.measure, opts.x);

    let voiceRefs = <Measure.ISegmentRef[]> _.flatten(_.map(<{ voices: Measure.ISegmentRef[] }[]> _.values(opts.measure.parts),
                    part => part.voices), true);
    let staffRefs = <Measure.ISegmentRef[]> _.flatten(_.map(<{ staves: Measure.ISegmentRef[] }[]> _.values(opts.measure.parts),
                    part => part.staves), true);

    let refs = voiceRefs.concat(staffRefs);

    let line = opts.line;

    return _processMeasure({
        line: line,
        measure: measureCtx,
        prevByStaff: opts.prevByStaff,
        segments: refs,
        _approximate: opts._approximate,
        _detached: opts._detached,
        factory: opts.factory
    });
}

/** 
 * Given the context and constraints given, estimates a width. These widths do not
 * 
 * @param opts structure with __normalized__ voices and staves
 * @returns an approximate width for a measure that is not the first on a line.
 */
export function approximateWidth(opts: IMeasureLayoutOptions): number {
    invariant(isNaN(opts.measure.width), "Engine.approximateWidth(...) must be passed a measure without an exact width.\n" +
        "Instead, it was passed a measure with opts.measure.width === " + opts.measure.width + ".\n" +
        "This most likely means a measure was modified in a way that requires an updated layout, but its\n" +
        "\"FrozenEngraved\" status was not cleared.");

    opts = <IMeasureLayoutOptions> _.extend({ _approximate: true, _detached: true }, opts);
    let layout = layoutMeasure(opts);
    return layout.width;
}

/** 
 * Lays out measures within a bar & justifies.
 * 
 * @returns new end of line
 */
export function justify(options: Options.ILayoutOptions, bounds: Options.ILineBounds,
        measures: Measure.IMeasureLayout[]): Measure.IMeasureLayout[] {
    let x = bounds.left;

    let measures$ = _.map(measures, Measure.IMeasureLayout.detach);

    /*---- 1. explode horizontally. ----*/

    _.forEach(measures$, function(measure$) {
        _.forEach(measure$.elements, function(elementArr$) {
            _.forEach(elementArr$, function(element$) {
                element$.x$ += x;
            });
        });
        x += measure$.width;
    });

    /*---- 2. justify ----*/

    // x > enX is possible if a single bar's minimum size exceeds maxX, or if our
    // guess for a measure width was too liberal. In either case, we're shortening
    // the measure width here, and our partial algorithm doesn't work with negative
    // padding.
    let partial = x < bounds.right && options.finalLine;

    let expandableCount = _.reduce(measures$, function(memo, measure$) {
        // Precondition: all layouts at a given index have the same "expandable" value.
        return _.reduce(measure$.elements[0], function(memo, element$) {
            return memo + (element$.expandable ? 1 : 0);
        }, memo);
    }, 0);

    let expansionRemaining: number;
    let avgExpansion: number;
    if (partial) {
        let expansionRemainingGuess = bounds.right - 3 - x;
        let avgExpansionGuess = expansionRemainingGuess / expandableCount;
        let weight = Util.logistic((avgExpansionGuess - bounds.right / 80) / 20) * 2 / 3;
        avgExpansion = (1 - weight)*avgExpansionGuess;
        expansionRemaining = avgExpansion * expandableCount;
    } else {
        expansionRemaining = bounds.right - x;
        avgExpansion = expansionRemaining/expandableCount;
    }

    let anyExpandable = false;
    _.forEachRight(measures$, function(measure) {
        let expansionRemainingHold = expansionRemaining;

        _.forEachRight(measure.elements, function(elementArr) {
            expansionRemaining = expansionRemainingHold;
            _.forEachRight(elementArr, function(element) {
                if (element.expandable) {
                    anyExpandable = true;
                    expansionRemaining -= avgExpansion;
                }
                element.x$ += expansionRemaining;
            });
        });

        measure.width += (expansionRemainingHold - expansionRemaining);
    });

    // TODO: center whole bar rests

    invariant(!anyExpandable || Math.abs(expansionRemaining) < 0.001, "expansionRemaining was not calculated correctly.");

    return measures$;
}

export function layoutLine$(options: Options.ILayoutOptions, bounds: Options.ILineBounds,
        memo$: Options.ILinesLayoutState): Options.ILineLayoutResult {
    let measures = options.measures;
    let clean$ = memo$.clean$;

    let allModels = _.reduce(measures, function(memo, measure) {
        let voiceRefs$ = <Measure.ISegmentRef[]> _.flatten(_.map(<{ voices: Measure.ISegmentRef[] }[]> _.values(measure.parts),
                        part => part.voices), true);
        let staffRefs$ = <Measure.ISegmentRef[]> _.flatten(_.map(<{ staves: Measure.ISegmentRef[] }[]> _.values(measure.parts),
                        part => part.staves), true);

        let refs = voiceRefs$.concat(staffRefs$);
        return memo.concat(refs);
    }, []);
    let line = Ctx.ILine.create(allModels);

    let layouts = _.map(measures, (measure, measureIdx) => {
        line.barOnLine = measureIdx;
        if (!(measure.uuid in clean$)) {
            clean$[measure.uuid] = layoutMeasure({
                measure: measure,
                prevByStaff: [],    // FIXME: include this.
                x: 0,               // Final offset set recorded in justify(...).
                line: line,
                factory: options.modelFactory
            });
        }
        return clean$[measure.uuid];
    });

    return {
        measureLayouts: justify(options, bounds, layouts)
    };
}

export function validate$(options$: Options.ILayoutOptions, memo$: Options.ILinesLayoutState): void {
    let factory         = options$.modelFactory;
    let modelHasType    = factory.modelHasType.bind(factory);
    let createModel     = factory.create.bind(factory);

    let lastAttribs: MusicXML.Attributes = null;

    _.forEach(options$.measures, function(measure) {
        if (!(measure.uuid in memo$.clean$)) {
            let voiceRefs$ = <Measure.ISegmentRef[]>
                    _.flatten(_.map(<{ voices: Measure.ISegmentRef[] }[]> _.values(measure.parts),
                            part => part.voices), true);

            let staffRefs$ = <Measure.ISegmentRef[]>
                    _.flatten(_.map(<{ staves: Measure.ISegmentRef[] }[]> _.values(measure.parts),
                            part => part.staves), true);

            let measureCtx = Ctx.IMeasure.detach(measure, 0);
            let refs = voiceRefs$.concat(staffRefs$);

            _.forEach(refs, ref => Measure.resetSegment$(ref, null, factory));
            Measure.normalizeDivisons$(refs, 0);

            _.forEach(staffRefs$, function(ref) {
                if (!ref) {
                    return;
                }
                let models = ref.staffSegment.models;
                if (!modelHasType(models[0], IModel.Type.Attributes)) {
                    models.splice(0, 0, createModel(IModel.Type.Attributes));
                }
            });

            // The layout function is overloaded to provide validation.
            _processMeasure({
                line: null,
                measure: measureCtx,
                prevByStaff: null,
                segments: refs,
                _approximate: true,
                _detached: true,
                _noAlign: true,
                _validateOnly: true, // <-- Just validate.
                factory: factory
            });

            console.log(measureCtx);
        }
    });
}

export function layout$(options: Options.ILayoutOptions,
        memo$: Options.ILinesLayoutState): Options.ILineLayoutResult[] {
    // TODO: multiple pages.

    let measures = options.measures;
    let width$ = memo$.width$;

    let bounds = Options.ILineBounds.calculate(options.pageLayout, options.page$);

    let widths = _.map(measures, measure => {
        if (!(measure.uuid in width$)) {
            width$[measure.uuid] = approximateWidth({
                measure: measure,
                prevByStaff: [], // FIXME:
                staves: _.map(_.values(measure.parts), p => p.staves),
                voices: _.map(_.values(measure.parts), p => p.voices),
                x: 0,
                line: null,
                factory: options.modelFactory
            });
        }
        return width$[measure.uuid];
    });

    function newLayoutWithoutMeasures(): Options.ILayoutOptions {
        return {
            measures: [],
            pageLayout: options.pageLayout,
            finalLine: false,
            page$: options.page$,
            modelFactory: options.modelFactory
        };
    }

    // Super-naive for now...
    let startingWidth = bounds.right - bounds.left - 150; // FIXME: replace 150 w/ proper __ESTIMATE__ space for start of line/staff
    let lineOpts$ = _.reduce(widths, function(memo, width, idx) {
        if (memo.remainingWidth > width) {
            memo.remainingWidth -= width;
        } else {
            memo.opts.push(newLayoutWithoutMeasures());
            memo.remainingWidth = startingWidth;
        }
        memo.opts[memo.opts.length - 1].measures.push(measures[idx]);
        return memo;
    }, {
        opts: <Options.ILayoutOptions[]>[newLayoutWithoutMeasures()],
        remainingWidth: startingWidth
    }).opts;

    lineOpts$[lineOpts$.length - 1].finalLine = true;

    return _.map(lineOpts$, function(lineOpt$) {
        return layoutLine$(lineOpt$, bounds, memo$);
    });
}

export function mutate$(options: Options.ILayoutOptions,
        memo$: Options.ILinesLayoutState, measureUUID: number,
        mutator: (measure$: Measure.IMutableMeasure) => void) {
    delete memo$.clean$[measureUUID];
    delete memo$.width$[measureUUID];
    mutator(_.find(options.measures, {"uuid": measureUUID}));
    // XXX: Call layout
    throw "Not implemented";
}

/**
 * Contains data that a ScoreStore can consume.
 */
export interface IDocument {
    error?:     any;
    factory?:   IModel.IFactory;
    header?:    ScoreHeader;
    measures?:  Measure.IMutableMeasure[];
    parts?:     IPart[];
}

export let MAX_SAFE_INTEGER = 9007199254740991;
