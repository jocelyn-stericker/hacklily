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

import {ICursor} from "../private/cursor";
import ILayout from "../private/layout";
import {MAX_SAFE_INTEGER} from "../private/constants";

/** 
 * Interface for things that implement objects that have a width, can be painted,
 * take up time (divisions), make sounds, and/or change state. Examples
 * include clefs, bars and notes.
 */
interface IModel {
    divCount: number;

    staffIdx: number;
    key?: string;

    /** 
     * Life-cycle method. Called before an attempt is made to layout the models.
     * Any changes to the current segment should be done here. For example, notation
     * checking is done here.
     */
    validate(cursor: ICursor): void;

    /** 
     * Life-cycle method. Called to layout the models.
     * At this point, all segments are frozen and must not be changed.
     */
    getLayout(cursor: ICursor): ILayout;
};

export default IModel;

/**
 * Assigns a random key to an object, usually for React.
 */
export function generateKey(model: IModel) {
    if (!model.key) {
        model.key = String(Math.floor(Math.random() * MAX_SAFE_INTEGER));
    }
}
