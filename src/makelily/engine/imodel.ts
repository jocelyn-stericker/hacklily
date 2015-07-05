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

import invariant = require("react/lib/invariant");

import ICursor from "./icursor"; // @circular
import {ISegment} from "./measure"; // @circular
import {Preprocessor, Postprocessor} from "./options";

/** 
 * Interface for things that implement objects that have a width, can be painted,
 * take up time (divisions), make sounds, and/or change state. Examples
 * include clefs, bars and notes.
 */
interface IModel {
    divCount?: number;
    staffIdx: number;
    frozenness: IModel.FrozenLevel;

    /** 
     * Life-cycle method. Called when the model is created from MusicXML.
     * Prototype chains should be added to unfrozen properties.
     */
    modelDidLoad$(segment$: ISegment): void;

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
        /**
         * If model is a proxy, return the model being proxied.
         * Otherwise, return the model passed in.
         */
        identity?: (model: IModel) => IModel;
        modelHasType: (model: IModel, ...modelTypes: IModel.Type[]) => boolean;
        search: (models: IModel[], idx: number, ...types: IModel.Type[]) => IModel[];

        preprocessors?: Preprocessor[];
        postprocessors?: Postprocessor[];
    }

    export enum FrozenLevel {
        /**
         * For rests at the end of a bar only. The model is unfrozen and can be
         * shortened as needed.
         */
        WarmPushable,

        /**
         * The model can be modified to apply best practices.
         */
        Warm,

        /**
         * The model can be modified to apply best practices in this frame, but will be
         * frozen to additional changes.
         */
        Freezing,

        /** Only downright errors can be fixed. */
        Frozen,

        /** Like frozen, but position is also fixed. */
        FrozenEngraved
    }

    export enum HMergePolicy {
        Invalid = 0,
        Max = 1,
        Min = 2
    }

    export enum Type {
        START_OF_LAYOUT_ELEMENTS = 0,
        Print = 10,
        Grouping = 30,
        FiguredBass = 40,
        END_OF_LAYOUT_ELEMENTS = 99,

        START_OF_STAFF_ELEMENTS = 100,
        Attributes = 110,
        Sound = 120,
        Direction = 130,
        Harmony = 140,
        Proxy = 150, // Does not implement a MusicXML API
        Spacer = 160, // Does not implement a MusicXML API
        END_OF_STAFF_ELEMENTS = 199,

        START_OF_VOICE_ELEMENTS = 200,
        Chord = 220, // Implements Note[]
        END_OF_VOICE_ELEMENTS = 299,

        Barline = 399, // Also deals with warning attributes

        Unknown = 1000
    };

    export interface ILayout {
        model: IModel;
        renderClass: Type;

        x$: number;
        division: number;
        mergePolicy: HMergePolicy;

        minSpaceBefore?: number;
        minSpaceAfter?: number;

        /**
         * Recorded by the engine, the part the model this layout represents is in.
         */
        part?: string;

        /**
         * The final, justified position of the model within a bar.
         * Set by the renderer.
         */
        overrideX?: number;

        /** 
         * References to bounding rectangles for annotations such as dots, words,
         * and slurs. The layout engine may modify these bounding rects to avoid
         * collisions and improve the look.
         * 
         * Lengths are in MusicXML tenths relative to (this.x, center line of staff),
         */
        boundingBoxes$?: IBoundingRect[];

        expandPolicy?: ExpandPolicy;

        /**
         * Must be set if expandPolicy is Centered
         */
        renderedWidth?: number;
    }
    export module ILayout {
        export function detach(layout: ILayout) {
            layout.overrideX = NaN;
            return Object.create(layout, {
                x$: {
                    get: function() {
                        return layout.overrideX || layout.x$;
                    },
                    set: function(x: number) {
                        layout.overrideX = x;
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
        None = 0,
        After = 1,
        Centered = 2
    }

    /**
     * Represents a child of a model that can move or be moved by other IBoundRects.
     * In particular, the layout engine modifies relativeX and relativeY of elements with
     * fixed=false to remove overlaps.
     */
    export interface IBoundingRect {
        /**
         * Position relative to parent model as computed by model.
         */
        defaultX: number;

        /**
         * Position relative to parent model as computed by model.
         */
        defaultY: number;

        /**
         * If true, relative coordinates cannot be changed by the layout engine
         */
        fixed?: boolean;

        /**
         * Position relative to ideal position as computed by layout engine.
         */
        relativeX?: number;

        /**
         * Position relative to ideal position as computed by layout engine.
         */
        relativeY?: number;

        /**
         * Visual top of bounding box
         */
        top: number;

        /**
         * Visual bottom of bounding box
         * Invariant: bottom > top
         */
        bottom: number;

        /**
         * Visual left of bounding box
         */
        left: number;

        /**
         * Visual right of bounding box.
         * Invariant: right > left
         */
        right: number;
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
        let detached: ICombinedLayout = {
            x: layout.x$,
            division: layout.division,
            mergePolicy: layout.mergePolicy,
            renderClass: layout.renderClass
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
        let attached: ILayout = {
            model: null,
            x$: layout.x,
            division: layout.division,
            mergePolicy: layout.mergePolicy,
            renderClass: layout.renderClass,
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
     * let memo = reduce(segments, IModelLayout.merge$, []);
     * reduce(segments, IModelLayout.merge$, memo);
     */
    export function merge$(segment1$: ICombinedLayout[], segment2$: ILayout[]): ICombinedLayout[] {
        let s1_idx = 0;
        let s2_idx = 0;
        let division: number;
        let x: number;

        while (s1_idx < segment1$.length || s2_idx < segment2$.length) {
            let item1 = segment1$[s1_idx];
            let item2 = segment2$[s2_idx];

            let div1 = !!item1 ? item1.division : Number.MAX_VALUE;
            let pri1 = !!item1 ? item1.renderClass : Number.MAX_VALUE;
            let div2 = !!item2 ? item2.division : Number.MAX_VALUE;
            let pri2 = !!item2 ? item2.renderClass : Number.MAX_VALUE;

            division = Math.min(div1, div2);
            if (div1 < div2 || div1 === div2 && pri1 < pri2) {
                x = item1.x;
                invariant(!!segment2$, "Segment2 must be defined");
                segment2$.splice(s2_idx, 0, reattachLayout(item1));
            } else if (div2 < div1 || div2 === div1 && pri2 < pri1) {
                x = item2.x$;
                segment1$.splice(s1_idx, 0, combineLayout(item2));
            } else {
                invariant(!!item1,
                    "div2 must be defined and have a valid division (is %s) & renderClass (is %s)",
                    div2, pri2);
                invariant(!!item2,
                    "div1 must be defined and have a valid division (is %s) & renderClass (is %s)",
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

export default IModel;
