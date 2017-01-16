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

import {Print, Grouping, FiguredBass, Attributes, Sound, Direction, Harmony,
        Barline} from "musicxml-interfaces";

import {IModel} from "./document_model";
import {IMeasure} from "./document_measure";
import Type from "./document_types";
import ProxyExports from "./implProxy_proxyModel";
import SpacerExports from "./implSpacer_spacerModel";
import VisualCursorExports from "./implVisualCursor_visualCursorModel";

import {IChord} from "./private_chordUtil";
import {IMeasureLayout} from "./private_measureLayout";
import {ILayoutOptions} from "./private_layoutOptions";
import {ILineBounds} from "./private_lineBounds";

export type IPreprocessor = (measures: IMeasure[]) => IMeasure[];

export type IPostprocessor = (options: ILayoutOptions, bounds: ILineBounds,
        measures: IMeasureLayout[]) => IMeasureLayout[];

export interface IFactory {
    create: (modelType: Type, options?: any) => IModel;
    fromSpec: (spec: any) => IModel;
    /**
     * If model is a proxy, return the model being proxied.
     * Otherwise, return the model passed in.
     */
    identity?: (model: IModel) => IModel;
    modelHasType(model: IModel, modelType: Type.Chord): model is (IChord & IModel);
    modelHasType(model: IModel, modelType: Type.Print): model is (Print & IModel);
    modelHasType(model: IModel, modelType: Type.Grouping): model is (Grouping & IModel);
    modelHasType(model: IModel, modelType: Type.FiguredBass): model is (FiguredBass & IModel);
    modelHasType(model: IModel, modelType: Type.Attributes): model is (Attributes & IModel);
    modelHasType(model: IModel, modelType: Type.Sound): model is (Sound & IModel);
    modelHasType(model: IModel, modelType: Type.Direction): model is (Direction & IModel);
    modelHasType(model: IModel, modelType: Type.Harmony): model is (Harmony & IModel);
    modelHasType(model: IModel, modelType: Type.Proxy): model is ProxyExports.IProxyModel;
    modelHasType(model: IModel, modelType: Type.Spacer): model is SpacerExports.ISpacerModel;
    modelHasType(model: IModel, modelType: Type.VisualCursor):
        model is VisualCursorExports.IVisualCursorModel;
    modelHasType(model: IModel, modelType: Type.Barline): model is (Barline & IModel);
    modelHasType(model: IModel, ...modelTypes: Type[]): boolean;
    search: (models: IModel[], idx: number, ...types: Type[]) => IModel[];

    preprocessors?: IPreprocessor[];
    postprocessors?: IPostprocessor[];
}
