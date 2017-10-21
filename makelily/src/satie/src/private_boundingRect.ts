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
