// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

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
