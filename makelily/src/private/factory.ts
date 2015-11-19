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

import IModel from "../document/model";
import Type from "../document/types";

import IPreprocessor from "./preprocessor";
import IPostprocessor from "./postprocessor";

interface IFactory {
    create: (modelType: Type, options?: any) => IModel;
    fromSpec: (spec: any) => IModel;
    /**
     * If model is a proxy, return the model being proxied.
     * Otherwise, return the model passed in.
     */
    identity?: (model: IModel) => IModel;
    modelHasType: (model: IModel, ...modelTypes: Type[]) => boolean;
    search: (models: IModel[], idx: number, ...types: Type[]) => IModel[];

    preprocessors?: IPreprocessor[];
    postprocessors?: IPostprocessor[];
}

export default IFactory;

