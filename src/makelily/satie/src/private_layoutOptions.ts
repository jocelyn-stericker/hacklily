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

import {ScoreHeader, Print} from "musicxml-interfaces";
import {IAny} from "musicxml-interfaces/operations";

import {Document, IMeasure, ISegment} from "./document";

import {IAttributesSnapshot} from "./private_attributesSnapshot";
import {IFactory, IPreprocessor, IPostprocessor} from "./private_factory";

export type IFixupFn = (segment: ISegment, operations: IAny[], restartRequired?: boolean) => void;

export interface ILayoutOptions {
    attributes: {[part: string]: IAttributesSnapshot[]};
    debug?: boolean;
    document: Document;
    fixup: IFixupFn;
    header: ScoreHeader;
    lineCount: number;
    lineIndex: number;
    measures: IMeasure[];
    modelFactory: IFactory;
    postprocessors: IPostprocessor[];
    preprocessors: IPreprocessor[];
    preview: boolean;
    print: Print;
    singleLineMode: boolean;
    fixedMeasureWidth?: number;
}
