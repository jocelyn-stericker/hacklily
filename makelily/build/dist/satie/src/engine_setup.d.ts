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
import Factory from "./engine_factory";
/**
 * Optional initialization function. Call this if you don't want the default options. Must be called
 * before any Satie component is mounted, and must only be called once.
 */
export declare function init(options: ISatieOptions): void;
/**
 * Options to pass into init(...). No options are required.
 */
export interface ISatieOptions {
    /**
     * For web browsers only.
     *
     * A list of fonts and variants (in parentheses) that are included on a webpage, that Satie
     * should not automatically load. You can get better performance improvements by putting font
     * loading inside your's HTML file's `<head></head>`
     *
     * e.g., "Alegreya", "Alegreya (bold)", "Bravura"
     */
    preloadedFonts?: string[];
    /**
     * For web browsers only.
     *
     * Specify where all the files Satie needs are.
     * By default, Satie looks inside `http[s]://vendor/`.
     */
    satieRoot?: string;
}
export declare function makeFactory(): Factory;
