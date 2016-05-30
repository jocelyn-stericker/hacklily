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

import {Print, SystemLayout} from "musicxml-interfaces";

import {getPageMargins} from "./print";

interface ILineBounds {
    left: number;
    right: number;
    systemLayout: SystemLayout;
}

export default ILineBounds;

export function calculate(print: Print, page: number): ILineBounds {
    let pageLayout = print.pageLayout;
    let pageMargins = getPageMargins(pageLayout.pageMargins, page);
    let systemMargins = print.systemLayout.systemMargins;
    let startX = systemMargins.leftMargin + pageMargins.leftMargin;
    let endX = systemMargins.rightMargin + pageLayout.pageWidth - pageMargins.rightMargin;

    return {
        left: startX,
        right: endX,
        systemLayout: print.systemLayout
    };
}

