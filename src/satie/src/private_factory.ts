// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

import type {
  Print,
  Grouping,
  FiguredBass,
  Attributes,
  Sound,
  Direction,
  Harmony,
  Barline,
  Note,
} from "#/musicxml-interfaces";

import type { IModel, IMeasure, Type } from "./document";
import type { IProxyModel } from "./implProxy_proxyModel";
import type { ISpacerModel } from "./implSpacer_spacerModel";
import type { IVisualCursorModel } from "./implVisualCursor_visualCursorModel";
import type { IAttributesSnapshot } from "./private_attributesSnapshot";
import type { IChord } from "./private_chordUtil";
import type { ILayoutOptions } from "./private_layoutOptions";
import type { ILineBounds } from "./private_lineBounds";
import type { IMeasureLayout } from "./private_measureLayout";

export type IPreprocessor = (measures: IMeasure[]) => IMeasure[];

export type IPostprocessor = (
  options: ILayoutOptions,
  bounds: ILineBounds,
  measures: IMeasureLayout[],
) => IMeasureLayout[];

export interface IFactory {
  create(modelType: Type.Chord, options?: any): IChord & IModel;
  create(modelType: Type.Print, options?: any): Print & IModel;
  create(modelType: Type.Grouping, options?: any): Grouping & IModel;
  create(modelType: Type.FiguredBass, options?: any): FiguredBass & IModel;
  create(modelType: Type.Attributes, options?: any): Attributes & IModel;
  create(modelType: Type.Sound, options?: any): Sound & IModel;
  create(modelType: Type.Direction, options?: any): Direction & IModel;
  create(modelType: Type.Harmony, options?: any): Harmony & IModel;
  create(modelType: Type.Proxy, options?: any): IProxyModel;
  create(modelType: Type.Spacer, options?: any): ISpacerModel;
  create(modelType: Type.VisualCursor, options?: any): IVisualCursorModel;
  create(modelType: Type.Barline, options?: any): Barline & IModel;
  create(modelType: Type, options?: any): IModel;
  fromSpec<T extends { _class: "Note" }>(spec: T): IChord & IModel;
  fromSpec(spec: Note): IChord & IModel;
  fromSpec<T extends { _class: "Chord" }>(spec: T): IChord & IModel;
  fromSpec<T extends { _class: "Print" }>(spec: T): Print & IModel;
  fromSpec<T extends { _class: "Grouping" }>(spec: T): Grouping & IModel;
  fromSpec<T extends { _class: "FiguredBass" }>(spec: T): FiguredBass & IModel;
  fromSpec<T extends { _class: "Attributes" }>(spec: T): Attributes & IModel;
  fromSpec<T extends { _class: "Sound" }>(spec: T): Sound & IModel;
  fromSpec<T extends { _class: "Direction" }>(spec: T): Direction & IModel;
  fromSpec<T extends { _class: "Harmony" }>(spec: T): Harmony & IModel;
  fromSpec<T extends { _class: "Proxy" }>(spec: T): IProxyModel;
  fromSpec<T extends { _class: "Spacer" }>(spec: T): ISpacerModel;
  fromSpec<T extends { _class: "VisualCursor" }>(spec: T): IVisualCursorModel;
  fromSpec(spec: any): IModel;
  /**
   * If model is a proxy, return the model being proxied.
   * Otherwise, return the model passed in.
   */
  identity?: (model: IModel) => IModel;
  modelHasType(model: IModel, modelType: Type.Chord): model is IChord & IModel;
  modelHasType(model: IModel, modelType: Type.Print): model is Print & IModel;
  modelHasType(
    model: IModel,
    modelType: Type.Grouping,
  ): model is Grouping & IModel;
  modelHasType(
    model: IModel,
    modelType: Type.FiguredBass,
  ): model is FiguredBass & IModel;
  modelHasType(
    model: IModel,
    modelType: Type.Attributes,
  ): model is Attributes & IModel & { _snapshot: IAttributesSnapshot };
  modelHasType(model: IModel, modelType: Type.Sound): model is Sound & IModel;
  modelHasType(
    model: IModel,
    modelType: Type.Direction,
  ): model is Direction & IModel;
  modelHasType(
    model: IModel,
    modelType: Type.Harmony,
  ): model is Harmony & IModel;
  modelHasType(model: IModel, modelType: Type.Proxy): model is IProxyModel;
  modelHasType(model: IModel, modelType: Type.Spacer): model is ISpacerModel;
  modelHasType(
    model: IModel,
    modelType: Type.VisualCursor,
  ): model is IVisualCursorModel;
  modelHasType(
    model: IModel,
    modelType: Type.Barline,
  ): model is Barline & IModel;
  modelHasType(model: IModel, ...modelTypes: Type[]): boolean;
  search(
    models: IModel[],
    idx: number,
    modelType: Type.Chord,
  ): (IChord & IModel)[];
  search(
    models: IModel[],
    idx: number,
    modelType: Type.Print,
  ): (Print & IModel)[];
  search(
    models: IModel[],
    idx: number,
    modelType: Type.Grouping,
  ): (Grouping & IModel)[];
  search(
    models: IModel[],
    idx: number,
    modelType: Type.FiguredBass,
  ): (FiguredBass & IModel)[];
  search(
    models: IModel[],
    idx: number,
    modelType: Type.Attributes,
  ): (Attributes & IModel)[];
  search(
    models: IModel[],
    idx: number,
    modelType: Type.Sound,
  ): (Sound & IModel)[];
  search(
    models: IModel[],
    idx: number,
    modelType: Type.Direction,
  ): (Direction & IModel)[];
  search(
    models: IModel[],
    idx: number,
    modelType: Type.Harmony,
  ): (Harmony & IModel)[];
  search(models: IModel[], idx: number, modelType: Type.Proxy): IProxyModel[];
  search(models: IModel[], idx: number, modelType: Type.Spacer): ISpacerModel[];
  search(
    models: IModel[],
    idx: number,
    modelType: Type.VisualCursor,
  ): IVisualCursorModel[];
  search(models: IModel[], idx: number, ...types: Type[]): IModel[];

  preprocessors?: IPreprocessor[];
  postprocessors?: IPostprocessor[];
}
