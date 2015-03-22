/**
 * (C) Josh Netterfield <joshua@nettek.ca> 2015.
 * Part of the Satie music engraver <https://github.com/ripieno/satie>.
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

import MusicXML             = require("musicxml-interfaces");
import _                    = require("lodash");

import IModel               = require("./imodel");
import Measure              = require("./measure");

export interface ILayoutOptions {
    attributes:     MusicXML.Attributes;
    measures:       Measure.IMutableMeasure[];
    pageLayout:     MusicXML.PageLayout;
    page$:          number;
    finalLine?:     boolean;
    modelFactory:   IModel.IFactory;
}

export interface ILinesLayoutState {
    width$: { [key: string]: number };
    clean$: { [key: string]: Measure.IMeasureLayout };
}

export module ILinesLayoutMemo {
    export function create(): ILinesLayoutState {
        return {
            width$: {},
            clean$: {}
        };
    }
}

export interface ILineLayoutResult {
    measureLayouts: Measure.IMeasureLayout[];
}

export interface ILineBounds {
    left: number;
    right: number;
}

export module ILineBounds {
    export function calculate(pageLayout: MusicXML.PageLayout, page: number): ILineBounds {
        var startX = 0;
        var endX = pageLayout.pageWidth;

        _.any(pageLayout.pageMargins, function(pageMargin) {
            if (pageMargin.type === null || pageMargin.type === undefined ||
                    pageMargin.type === MusicXML.OddEvenBoth.Both ||
                    (pageMargin.type === MusicXML.OddEvenBoth.Even) && !(page % 2) ||
                    (pageMargin.type === MusicXML.OddEvenBoth.Odd) && !!(page % 2)) {
                startX += pageMargin.leftMargin;
                endX -= pageMargin.rightMargin;
                return true;
            }
            return false;
        });

        return {
            left: startX,
            right: endX
        };
    }
}

