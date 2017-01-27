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

import {IModel, Type} from "./document";

import {IBoundingRect} from "./private_boundingRect";
import {IReadOnlyValidationCursor, LayoutCursor} from "./private_cursor";
import {MAX_SAFE_INTEGER} from "./private_util";

/** 
 * Interface for things that implement objects that have a width, can be painted,
 * take up time (divisions), make sounds, and/or change state. Examples
 * include clefs, bars and notes.
 */
export interface IModel {
    divCount: number;

    staffIdx: number;
    key?: string;

    /** 
     * Life-cycle method. Called before an attempt is made to layout the models.
     * Any changes to the current segment should be done here. For example, notation
     * checking is done here.
     */
    refresh(cursor: IReadOnlyValidationCursor): void;

    /** 
     * Life-cycle method. Called to layout the models.
     * At this point, all segments are frozen and must not be changed.
     */
    getLayout(cursor: LayoutCursor): ILayout;

    /**
     * Based on the number of durations in the shortest element on a line, computes the
     * approximate width of this element.
     */
    calcWidth(shortest: number): number;
};

/**
 * Assigns a random key to an object, usually for React.
 */
export function generateModelKey(model: IModel) {
    if (!model.key) {
        model.key = String(Math.floor(Math.random() * MAX_SAFE_INTEGER));
    }
}

export interface ILayout {
    model: IModel;
    renderClass: Type;

    x: number;
    division: number;

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
    boundingBoxes?: IBoundingRect[];

    expandPolicy?: "none" | "centered" | "after";

    /**
     * Must be set if expandPolicy is Centered
     */
    renderedWidth?: number;

    key?: string;
}

export function detach(layout: ILayout) {
    layout.overrideX = NaN;
    return Object.create(layout, {
        x: {
            get: function() {
                return layout.overrideX || layout.x;
            },
            set: function(x: number) {
                layout.overrideX = x;
            }
        }
    });
}
