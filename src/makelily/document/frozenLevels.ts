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

enum FrozenLevel {
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

export default FrozenLevel;

