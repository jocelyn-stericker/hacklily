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

import {Print, SystemLayout, Scaling} from "musicxml-interfaces";

import {getPageMargins} from "./private_print";

export interface ILineBounds {
    left: number;
    right: number;
    systemLayout: SystemLayout;
    top: number;
}

export function calculateLineBounds(print: Print, pageNum: number, scaling: Scaling): ILineBounds {
    const pageLayout = print.pageLayout;
    const systemLayout = print.systemLayout;
    const pageMargins = getPageMargins(pageLayout.pageMargins, pageNum);
    const systemMargins = systemLayout.systemMargins;
    const startX = systemMargins.leftMargin + pageMargins.leftMargin;
    const endX = systemMargins.rightMargin + pageLayout.pageWidth - pageMargins.rightMargin;
    const scale40 = scaling.millimeters / scaling.tenths * 40; // TODO: 40 should be 10 x (numLines - 1)
    const top = pageLayout.pageHeight - scale40 * 10 / 2 -
        (systemLayout.topSystemDistance +
            pageMargins.topMargin);

    return {
        left: startX,
        right: endX,
        systemLayout: systemLayout,
        top,
    };
}
