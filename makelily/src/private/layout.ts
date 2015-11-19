/**
 * @source: https://github.com/jnetterf/satie/
 *
 * @license
 * (C) Josh Netterfield <joshua@nettek.ca> 2015.
 * Part of the Satie music engraver <https://github.com/jnetterf/satie>.
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

import ExpandPolicy from "../document/expandPolicies";
import IModel from "../document/model";
import Type from "../document/types";

import IBoundingRect from "./boundingRect";

interface ILayout {
    model: IModel;
    renderClass: Type;

    x$: number;
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
    boundingBoxes$?: IBoundingRect[];

    expandPolicy?: ExpandPolicy;

    /**
     * Must be set if expandPolicy is Centered
     */
    renderedWidth?: number;

    key?: string;
}

export default ILayout;

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
        }
    });
}
