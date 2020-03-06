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
import { getPageMargins } from "./private_print";
export function calculateLineBounds(print, pageNum, scaling) {
    var pageLayout = print.pageLayout;
    var systemLayout = print.systemLayout;
    var pageMargins = getPageMargins(pageLayout.pageMargins, pageNum);
    var systemMargins = systemLayout.systemMargins;
    var startX = systemMargins.leftMargin + pageMargins.leftMargin;
    var endX = systemMargins.rightMargin + pageLayout.pageWidth - pageMargins.rightMargin;
    var scale40 = (scaling.millimeters / scaling.tenths) * 40; // TODO: 40 should be 10 x (numLines - 1)
    var top = pageLayout.pageHeight -
        (scale40 * 10) / 2 -
        (systemLayout.topSystemDistance + pageMargins.topMargin);
    return {
        left: startX,
        right: endX,
        systemLayout: systemLayout,
        top: top,
    };
}
//# sourceMappingURL=private_lineBounds.js.map