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
 * @file engine/imodel.ts Interface of and tools for models.
 */

"use strict";

import invariant        = require("react/lib/invariant");

import ICursor          = require("./icursor"); // @circular
import Measure          = require("./measure"); // @circular

/** 
 * Interface for models that implement objects that have a width, can be painted, take up time (divisions),
 * and/or change state. Examples include clefs, bars and notes.
 */
interface IModel {
    divCount?:       number;
    staffIdx:        number;
    frozenness:      IModel.FrozenLevel;

    /** 
     * Life-cycle method. Called when the model is created from MusicXML.
     * Prototype chains should be added to unfrozen properties.
     */
    modelDidLoad$(segment$: Measure.ISegment): void;

    /** 
     * Life-cycle method. Called before an attempt is made to layout the models.
     * Any changes to the current segment should be done here. For example, notation
     * checking is done here.
     */
    validate$(cursor$: ICursor): void;

    /** 
     * Life-cycle method. Called to layout the models.
     * At this point, all segments are frozen and must not be changed.
     */
    layout(cursor$: ICursor): IModel.ILayout;
};

module IModel {
    export interface IFactory {
        create: (modelType: IModel.Type, options?: any) => IModel;
        fromSpec: (spec: any) => IModel;
        modelHasType: (model: IModel, ...modelTypes: IModel.Type[]) => boolean;
        searchHere: (models: IModel[], idx: number, ...types: IModel.Type[]) => IModel[];
    }

    export enum FrozenLevel {
        /** For rests at the end of a bar only. The model is unfrozen and can be shortened as needed. */
        WarmPushable,

        /** The model can be modified to apply best practices. */
        Warm,

        /** The model can be modified to apply best practices in this frame, but will be frozen to additional changes. */
        Freezing,

        /** Only downright errors can be fixed. */
        Frozen,

        /** Like frozen, but position is also fixed. */
        FrozenEngraved
    }

    export enum HMergePolicy {
        Invalid                 = 0,
        Max                     = 1,
        Min                     = 2
    }

    export enum Type {
        START_OF_LAYOUT_ELEMENTS    = 0,
        Print                       = 10,           // Implements MusicXML.Print
        Grouping                    = 30,           // Implements MusicXML.Grouping
        FiguredBass                 = 40,           // Implements MusicXML.FiguredBass
        END_OF_LAYOUT_ELEMENTS      = 99,

        START_OF_STAFF_ELEMENTS     = 100,
        Attributes                  = 110,          // Implements MusicXML.Attributes
        Sound                       = 120,          // Implements MusicXML.Sound
        Direction                   = 130,          // Implements MusicXML.Direction
        Harmony                     = 140,          // Implements MusicXML.Harmony
        Proxy                       = 150,          // Does not implement a MusicXML API
        Spacer                      = 160,          // Does not implement a MusicXML API
        END_OF_STAFF_ELEMENTS       = 199,

        START_OF_VOICE_ELEMENTS     = 200,
        Chord                       = 220,          // Like MusicXML.Note[]
        END_OF_VOICE_ELEMENTS       = 299,

        Barline                     = 399,          // Implements MusicXML.Barline

        Unknown                     = 1000
    };

    export interface ILayout {
        model:              IModel;
        renderClass:        Type;

        x$:                 number;
        division:           number;
        mergePolicy:        HMergePolicy;

        /**
         * The final, justified position of the model within a bar.
         * Set by the renderer.
         */
        barX?:              number;

        /** 
         * References to bounding rectangles for annotations such as dots, words,
         * and slurs. The layout engine may modify these bounding rects to avoid
         * collisions and improve the look.
         * 
         * Lengths are in MusicXML tenths relative to (this.x, center line of staff),
         */
        boundingBoxes$?:    IBoundingRect[];

        expandPolicy?:      ExpandPolicy;

        /**
         * Must be set if expandPolicy is Centered
         */
        renderedWidth?:        number;
    }
    export module ILayout {
        export function detach(layout: ILayout) {
            layout.barX = NaN;
            return Object.create(layout, {
                x$: {
                    get: function() {
                        return layout.barX || layout.x$;
                    },
                    set: function(x: number) {
                        layout.barX = x;
                    }
                },
                model: {
                    get: function() {
                        return layout.model;
                    }
                }
            });
        }
    }
    export enum ExpandPolicy {
        None        = 0,
        After       = 1,
        Centered    = 2
    }

    export interface IBoundingRect {
        frozenness:     IModel.FrozenLevel;
        /**
         * If unspecified, relative to line.
         */
        relativeTo?:    IModel.RelativeTo;
        fixed?:         boolean;
        defaultX:       number;
        defaultY:       number;
        relativeX?:     number;
        relativeY?:     number;
        w:              number;
        h:              number;
    }

    export enum RelativeTo {
        Line = 0,
        Model = 1
    }

    export interface ICombinedLayout {
        x: number;
        mergePolicy: HMergePolicy;
        division: number;
        renderClass: Type;
        expandPolicy?: ExpandPolicy;
        renderedWidth?: number;
    }

    export function combineLayout(layout: IModel.ILayout): ICombinedLayout {
        var detached: ICombinedLayout = {
            x:              layout.x$,
            division:       layout.division,
            mergePolicy:    layout.mergePolicy,
            renderClass:    layout.renderClass
        };
        if (layout.expandPolicy) {
            detached.expandPolicy = layout.expandPolicy;
            if (layout.expandPolicy === ExpandPolicy.Centered) {
                invariant(!isNaN(layout.renderedWidth),
                    "renderedWidth must be a number for centered objects, but it's %s",
                    layout.renderedWidth);
                detached.renderedWidth = layout.renderedWidth;
            }
        }
        return detached;
    }

    export function reattachLayout(layout: IModel.ICombinedLayout): ILayout {
        var attached: ILayout = {
            model:          null,
            x$:             layout.x,
            division:       layout.division,
            mergePolicy:    layout.mergePolicy,
            renderClass:    layout.renderClass,
        };
        if (layout.expandPolicy) {
            attached.expandPolicy = layout.expandPolicy;
            if (layout.expandPolicy === ExpandPolicy.Centered) {
                invariant(!isNaN(layout.renderedWidth),
                    "renderedWidth must be a number for centered objects, but it's %s",
                    layout.renderedWidth);
                attached.renderedWidth = layout.renderedWidth;
            }
        }

        return attached;
    }

    /** 
     * Helper to line up two streams that have some overlap.
     * Divisions in each segment must be the same.
     * 
     * @code
     * var memo =_.reduce(segments, IModelLayout.merge$, []);
     * _.reduce(segments, IModelLayout.merge$, memo);
     */
    export function merge$(segment1$: ICombinedLayout[], segment2$: ILayout[]): ICombinedLayout[] {
        var s1_idx = 0;
        var s2_idx = 0;
        var division: number;
        var x: number;

        while (s1_idx < segment1$.length || s2_idx < segment2$.length) {
            var item1 = segment1$[s1_idx];
            var item2 = segment2$[s2_idx];

            var div1 = !!item1 ? item1.division : Number.MAX_VALUE;
            var pri1 = !!item1 ? item1.renderClass : Number.MAX_VALUE;
            var div2 = !!item2 ? item2.division : Number.MAX_VALUE;
            var pri2 = !!item2 ? item2.renderClass : Number.MAX_VALUE;

            division = Math.min(div1, div2);
            if (div1 < div2 || div1 === div2 && pri1 < pri2) {
                x = item1.x;
                invariant(!!segment2$, "Segment2 must be defined");
                segment2$.splice(s2_idx, 0, reattachLayout(item1));
            } else if (div2 < div1 || div2 === div1 && pri2 < pri1) {
                x = item2.x$;
                segment1$.splice(s1_idx, 0, combineLayout(item2));
            } else {
                invariant(!!item1, "div2 must be defined and have a valid division (is %s) & renderClass (is %s)",
                    div2, pri2);
                invariant(!!item2, "div1 must be defined and have a valid division (is %s) & renderClass (is %s)",
                    div1, pri1);
                invariant(pri1 === pri2, "invalid priority: %s must equal %s", pri1, pri2);
                invariant(div1 === div2, "invalid division");
                switch(segment2$[s2_idx].mergePolicy) {
                    case HMergePolicy.Max:
                        x = Math.max(item1.x, item2.x$);
                        break;
                    case HMergePolicy.Min:
                        x = Math.min(item1.x, item2.x$);
                        break;
                    default:
                        invariant(false, "Invalid merge policy %s", segment2$[s2_idx].mergePolicy);
                        break;
                }
                item1.x = item2.x$ = x;
            }
            ++s1_idx;
            ++s2_idx;
        };
        return segment1$;
    }
}

// Register Note as Chord.
(<any>IModel.Type)["Note"] = IModel.Type.Chord;

export = IModel;
