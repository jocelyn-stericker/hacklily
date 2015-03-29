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
 * 1. Render Flow
 * ==============
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
 *      Models can pretend there is only one voice and one
 *      staff. The engine itself handles merging voices and staffs,
 *      as well as complex notation involving one voice across
 *      multiple staves.
 * 
 *      Layouts for VALIDATED and RENDERED models are memoized,
 *      so that neither validate$ layout need to be called on
 *      Models when a change happens that does not affect it.
 * 
 * Lay-out ("VALIDATED" -> "RENDERED")
 * -----------------------------------
 *   5. Context gets assigned a page and line based on guess      (Engine.layout$)
 *   6. Actual layout created                                      (IModel.layout)
 *   7. Layout is justified or semi-justified, and assigned a
 *      vertical position
 *   8. Elements outside of staff (lyrics, notations, ...) are
 *      positioned
 * 
 * 2. Box Model
 * ============
 * 
 * Satie's layout model is based on MusicXML's default and relative positioning.
 * See MusicXML.Position. Contrary to SVG where the origin is the top left corner,
 * the origin in MusicXML and Satie is the bottom left corner.
 * 
 * The position of an object, in SVG coordinates scaled to equal tenths, is calculated as:
 *  x = context.originX + layout.model.defaultX + model.relativeX
 *  y = context.originY - layout.model.defaultY - model.defaultY
 * 
 * relativeX and relativeY
 * -----------------------
 * Manual or special-case changes to the default position calculated in validate$ or fit$.
 * 
 * defaultX and defaultY
 * ---------------------
 * These values are generally calculated in the layout layer of the engraving process, but
 * can be set manually. Layouts extend the model they hold via prototypical inheritance
 * to set defaultX and defaultY if it was not already set in the manual.
 * 
 * originX and originY
 * -------------------
 * Different objects have different positions in MusicXML. For example, credits are relative
 * to (0, height), so originX = 0 and originY = height. Notes are relative to the top (!!) left
 * of a measure. See MusicXML documentation for each component. originX and originY are set
 * by React context.
 * 
 * React provides three ways of storing information. State is useful for storing data used by
 * the same component that sets it. Props is useful for passing date from one component
 * to its direct children. Context is like props, but can be passed to non-direct children. It
 * is currently undocumented. See MeasureView and Attributes for an example of context is used.
 * 
 * 3. Editing Flow
 * ===============
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
export import IPrint            = require("./engine/iprint");
export import Measure           = require("./engine/measure");
export import Options           = require("./engine/options");
export import RenderUtil        = require("./engine/renderUtil");
export import ScoreHeader       = require("./engine/scoreHeader");
export import Util              = require("./engine/util");

import MeasureProcessor         = require("./engine/measureProcessor");

if (process.env.NODE_ENV !== "production") {
    /* tslint:disable */
    require("source-map-support").install();
    /* tslint:enable */
}

/*---- Engine -----------------------------------------------------------------------------------*/

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

    factory:        IModel.IFactory;
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

    return MeasureProcessor.reduce({
        attributes:     opts.attributes,
        factory:        opts.factory,
        header:         opts.header,
        line:           line,
        measure:        measureCtx,
        prevByStaff:    opts.prevByStaff,
        segments:       segments,

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

/** 
 * Lays out measures within a bar & justifies.
 * 
 * @returns new end of line
 */
export function justify(options: Options.ILayoutOptions, bounds: Options.ILineBounds,
        measures: Measure.IMeasureLayout[]): Measure.IMeasureLayout[] {

    let measures$ = _.map(measures, Measure.IMeasureLayout.detach);

    const x = bounds.left + _.reduce(measures$, (sum, measure) => sum + measure.width, 0);

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
    if (!expandableCount) {
        avgExpansion = 0;
        expansionRemaining = 0;
    } else if (partial) {
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
    let attributes = options.attributes;
    let clean$ = memo$.clean$;

    let allModels = _.reduce(measures, function(memo, measure) {
        let voiceSegments$ = <Measure.ISegment[]> _.flatten(_.map(_.values(measure.parts), part => part.voices));
        let staffSegments$ = <Measure.ISegment[]> _.flatten(_.map(_.values(measure.parts), part => part.staves));

        let segments = _.filter(voiceSegments$.concat(staffSegments$), s => !!s);
        return memo.concat(segments);
    }, []);
    let line = Ctx.ILine.create(allModels);

    let layouts = _.map(measures, (measure, measureIdx) => {
        line.barOnLine = measureIdx;
        if (!(measure.uuid in clean$)) {
            clean$[measure.uuid] = layoutMeasure({
                attributes:     attributes,
                factory:        options.modelFactory,
                header:         options.header,
                line:           line,
                measure:        measure,
                prevByStaff:    [],    // FIXME: include this.
                x:              0      // Final offset set recorded in justify(...).
            });
        }
        // Update attributes for next measure
        attributes = clean$[measure.uuid].attributes;
        return clean$[measure.uuid];
    });

    let paddingTop          = _.max(layouts, mre => mre.paddingTop).paddingTop;
    let top                 = memo$.y$ + paddingTop;
    let nextPaddingBottom   = _.max(layouts, mre => mre.paddingBottom).paddingBottom;
    memo$.y$                = top - nextPaddingBottom - bounds.systemLayout.systemDistance;
    _.forEach(layouts, layout => {
        layout.originY = top;
        layout.originX += bounds.left;
    });

    return justify(options, bounds, layouts);
}

export function validate$(options$: Options.ILayoutOptions, memo$: Options.ILinesLayoutState): void {
    let factory         = options$.modelFactory;
    let searchHere      = factory.searchHere.bind(factory);
    let createModel     = factory.create.bind(factory);

    let lastAttribs: MusicXML.Attributes = null;

    _.forEach(options$.measures, function validateMeasure(measure) {
        if (!(measure.uuid in memo$.clean$)) {
            let voiceSegments$ = <Measure.ISegment[]>
                _.flatten(_.map(_.values(measure.parts), part => part.voices));
            let staffSegments$ = <Measure.ISegment[]>
                _.flatten(_.map(_.values(measure.parts), part => part.staves));

            let measureCtx = Ctx.IMeasure.detach(measure, 0);
            let segments = _.filter(voiceSegments$.concat(staffSegments$), s => !!s);

            _.forEach(staffSegments$, function(segment) {
                if (!segment) {
                    return;
                }
                if (!searchHere(segment, 0, IModel.Type.Print).length) {
                    segment.splice(0, 0, createModel(IModel.Type.Print));
                }
                if (!searchHere(segment, 0, IModel.Type.Attributes).length) {
                    segment.splice(0, 0, createModel(IModel.Type.Attributes));
                }
            });

            Measure.normalizeDivisons$(segments, 0);

            // The layout function is overloaded to provide validation.
            let outcome = MeasureProcessor.reduce({
                attributes:     lastAttribs,
                header:         options$.header,
                line:           null,
                measure:        measureCtx,
                prevByStaff:    null,
                segments:       segments,
                _approximate:   true,
                _detached:      true,
                _noAlign:       true,
                _validateOnly:  true, // Just validate, don't make a layout
                factory:        factory
            });
            lastAttribs = outcome.attributes;
        }
    });
}

export function layout$(options: Options.ILayoutOptions,
        memo$: Options.ILinesLayoutState): Options.ILineLayoutResult[] {
    // TODO: multiple pages.

    let measures = options.measures;
    let width$ = memo$.width$;

    invariant(!!options.print$, "Print not defined");
    let boundsGuess = Options.ILineBounds.calculate(options.print$, options.page$);

    let widths = _.map(measures, (measure, idx) => {
        // Create an array of the IMeasureParts of the previous, current, and next measures
        let neighbourMeasures: Measure.IMeasurePart[] = <any> _.flatten([
            !!measures[idx - 1] ? _.values(measures[idx - 1].parts) : <Measure.IMeasurePart> {
                voices: [],
                staves: []
            },
            _.values(measure.parts),
            !!measures[idx + 1] ? _.values(measures[idx + 1].parts) : <Measure.IMeasurePart> {
                voices: [],
                staves: []
            }
        ]);
        // Join all of the above models
        let neighbourModels = <Measure.ISegment[]> _.flatten(
            _.map(neighbourMeasures, m => m.voices.concat(m.staves))
        );
        if (!(measure.uuid in width$)) {
            width$[measure.uuid] = approximateWidth({
                attributes:     options.attributes,
                factory:        options.modelFactory,
                header:         options.header,
                line:           Ctx.ILine.create(neighbourModels),
                measure:        measure,
                prevByStaff:    [], // FIXME:
                staves:         _.map(_.values(measure.parts), p => p.staves),
                voices:         _.map(_.values(measure.parts), p => p.voices),
                x:              0
            });
        }
        return width$[measure.uuid];
    });

    let thisPrint: MusicXML.Print = null;
    function updatePrint(measure: Measure.IMutableMeasure) {
        let partWithPrint = _.find(measure.parts, part => !!part.staves[1] &&
                options.modelFactory.searchHere(part.staves[1], 0, IModel.Type.Print).length);
        if (partWithPrint) {
            let print = <any> options.modelFactory.searchHere(partWithPrint.staves[1], 0,
                    IModel.Type.Print)[0];
            thisPrint = print;
        }
    }
    function newLayoutWithoutMeasures(): Options.ILayoutOptions {
        return {
            attributes:     null,
            measures:       [],
            header:         options.header,
            print$:         thisPrint,
            finalLine:      false,
            page$:          options.page$,
            modelFactory:   options.modelFactory
        };
    }

    // Super-naive for now...
    let startingWidth = boundsGuess.right - boundsGuess.left - 150;
        // FIXME: replace 150 w/ proper __ESTIMATE__ space for start of line/staff
    let lineOpts$ = _.reduce(widths, function(memo, width, idx) {
        updatePrint(measures[idx]);
        memo.opts[memo.opts.length - 1].print$ = thisPrint;
        invariant(!!thisPrint, "No print found");
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
        return layoutLine$(lineOpt$, Options.ILineBounds.calculate(lineOpt$.print$,
                options.page$), memo$);
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
    parts?:     string[];
}

export const key$ = MeasureProcessor.key$;
export const MAX_SAFE_INTEGER = MeasureProcessor.MAX_SAFE_INTEGER;
