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

import IMeasurePart from "./measurePart";

/**
 * Based on MusicXML's Measure, but with additional information, and with a staff/voice-seperated and
 * monotonic parts element.
 */
interface IMeasure {
    idx: number; // 0-indexed, can change
    uuid: number;
    number: string; // 1-indexed
    implicit?: boolean;
    width?: number;
    nonControlling?: boolean;
    parts: {
        [id: string]: IMeasurePart;
    };

    /**
     * Incremented whenever anything in the measure changes.
     * Local only and monotonic.
     */
    version: number;
};

export default IMeasure;
