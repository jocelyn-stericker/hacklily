// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

import type { Type } from "./document";
import type { IBoundingRect } from "./private_boundingRect";
import type { IReadOnlyValidationCursor, LayoutCursor } from "./private_cursor";
import { MAX_SAFE_INTEGER } from "./private_util";

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
}

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
      get: function () {
        return layout.overrideX || layout.x;
      },
      set: function (x: number) {
        layout.overrideX = x;
      },
    },
  });
}
