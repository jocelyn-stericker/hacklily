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

import {Pitch} from "musicxml-interfaces";

import ISong from "../document/song";

import {init, ISatieOptions} from "./setup";
import Song from "./song";

export type IHandler = (path: (string|number)[], pitch: Pitch) => void;

let _didInit = false;

export default class Application {
    constructor(options: ISatieOptions) {
        if (_didInit) {
            throw new Error("There can only be one Satie Application.");
        }

        _didInit = true;
        init(options);
    }

    newSong(options: {
                errorHandler: (error: Error) => void,
                changeHandler: () => void,
                mouseMoveHandler: IHandler,
                mouseClickHandler: IHandler,

                musicXML: string,
                pageClassName?: string
            }) {
        return new Song(options) as ISong;
    }
}

