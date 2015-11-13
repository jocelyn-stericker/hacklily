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

import {ScoreHeader, Print} from "musicxml-interfaces";
import {IAny} from "musicxml-interfaces/operations";

import IMeasure from "../document/measure";
import ISegment from "../document/segment";

import IAttributesSnapshot from "./attributesSnapshot";
import IFactory from "./factory";
import IPreprocessor from "./preprocessor";
import IPostprocessor from "./postprocessor";

interface ILayoutOptions {
    attributes: {[part: string]: IAttributesSnapshot[]};
    preview: boolean;
    measures: IMeasure[];
    header: ScoreHeader;
    print$: Print;
    page$: number;
    line?: number;
    lines?: number;
    modelFactory: IFactory;
    debug?: boolean;
    preprocessors: IPreprocessor[];
    postprocessors: IPostprocessor[];
    fixup: (segment: ISegment, operations: IAny[]) => void;
}

export default ILayoutOptions;
