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

import MusicXML = require("musicxml-interfaces");

import IModel from "./imodel";
import IPrint from "./iprint";
import {IMutableMeasure, IMeasureLayout} from "./measure";

export interface ILayoutOptions {
    attributes: {[part: string]: MusicXML.Attributes};
    measures: IMutableMeasure[];
    header: MusicXML.ScoreHeader;
    print$: MusicXML.Print;
    page$: number;
    line?: number;
    lines?: number;
    modelFactory: IModel.IFactory;
    debug?: boolean;
    preprocessors: Preprocessor[];
    postprocessors: Postprocessor[];
}

export interface IWidthInformation {
    width: number;
    attributesWidthStart: number;
    attributesWidthEnd: number;
}

export type Preprocessor = (measures: IMutableMeasure[]) => IMutableMeasure[];
export type Postprocessor = (options: ILayoutOptions, bounds: ILineBounds,
        measures: IMeasureLayout[]) => IMeasureLayout[];

export interface ILinesLayoutState {
    width$: { [key: string]: IWidthInformation };
    multipleRests$: { [key: string]: number };
    clean$: { [key: string]: IMeasureLayout };
    y$: number;
}

export module ILinesLayoutMemo {
    export function create(top: number): ILinesLayoutState {
        return {
            y$: top,
            width$: {},
            multipleRests$: {},
            clean$: {}
        };
    }
}

export interface ILineLayoutResult extends Array<IMeasureLayout> {
}

export interface ILineBounds {
    left: number;
    right: number;
    systemLayout: MusicXML.SystemLayout;
}

export module ILineBounds {
    export function calculate(print: MusicXML.Print, page: number): ILineBounds {
        let pageLayout = print.pageLayout;
        let pageMargins = IPrint.getPageMargins(pageLayout.pageMargins, page);
        let systemMargins = print.systemLayout.systemMargins;
        let startX = systemMargins.leftMargin + pageMargins.leftMargin;
        let endX = systemMargins.rightMargin + pageLayout.pageWidth -
                pageMargins.rightMargin;

        return {
            left: startX,
            right: endX,
            systemLayout: print.systemLayout
        };
    }
}

/**
 * Contains data that a ScoreStore can consume.
 */
export interface IDocument {
    error?: any;
    factory?: IModel.IFactory;
    header?: MusicXML.ScoreHeader;
    measures?: IMutableMeasure[];
    parts?: string[];
}

export enum RenderTarget {
    SvgWeb = 0,
    SvgExport = 1
}

/**
 * Assigns a random key to an object, usually for React.
 */
export function key$(t$: any) {
    if (!t$.key) {
        t$.key = Math.floor(Math.random() * MAX_SAFE_INTEGER);
    }
}

export const MAX_SAFE_INTEGER = 9007199254740991;
