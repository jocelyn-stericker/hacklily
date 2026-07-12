// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

/* eslint-disable import/first */

import { find } from "lodash";
import type { ReactElement } from "react";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import type {
  ScoreHeader,
  Print,
  Grouping,
  FiguredBass,
  Attributes,
  Sound,
  Direction,
  Harmony,
  Barline,
} from "#/musicxml-interfaces";
import type { IAny } from "#/musicxml-interfaces/operations";

import type { IMeasure } from "./document_measure";
import type { IModel } from "./document_model";
import Type from "./document_types";
import type { ILinePlacementHint } from "./engine_processors_layout";
import layoutSong from "./engine_processors_layout";
import validate from "./engine_processors_validate";
import PageView from "./implPage_pageView";
import type { IProxyModel } from "./implProxy_proxyModel";
import type { ISpacerModel } from "./implSpacer_spacerModel";
import type { IVisualCursorModel } from "./implVisualCursor_visualCursorModel";
import type { IAttributesSnapshot } from "./private_attributesSnapshot";
import type { IChord } from "./private_chordUtil";
import type { IFactory } from "./private_factory";
import type { ILayoutOptions } from "./private_layoutOptions";

export * from "./document_measure";
export * from "./document_model";
export * from "./document_song";
export { default as Type } from "./document_types";

import type { IMeasureLayout } from "./private_measureLayout";

export interface ICleanlinessTracking {
  measures: {
    [measure: string]: {
      /** x is cleared whenever rerendering a dirty measure not in preview mode */
      x: {
        [part: string]: {
          [voice: number]: {
            voiceX: number[];
            staffX: { [staff: number]: number[] };
          };
        };
      };
      clean: IMeasureLayout;
      layout: IMeasureLayout;
    };
  };
  lines: number[][];
  linePlacementHints: ReadonlyArray<ILinePlacementHint>;
}

/**
 * Models a document in a certain state. Songs wrap documents to support change tracking.
 * Songs should not be mutated by user code.
 */
export class Document {
  error: Error;
  header: ScoreHeader;
  measures: IMeasure[];
  parts: string[];
  _visualCursor: any;

  private _factory: IFactory;

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
  modelHasType(model: IModel, ...modelTypes: Type[]): boolean {
    return this._factory.modelHasType(model, ...modelTypes);
  }

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
  search(models: IModel[], idx: number, ...types: Type[]): IModel[] {
    return this._factory.search(models, idx, ...types);
  }

  getPrint(startMeasure: number): Print {
    const firstMeasure = this.measures[startMeasure];
    if (!firstMeasure) {
      throw new Error("No such measure " + startMeasure);
    }
    const partWithPrint = find(
      firstMeasure.parts,
      (part) =>
        !!part.staves[1] &&
        this.search(part.staves[1], 0, Type.Print).length > 0,
    );

    if (partWithPrint) {
      return this.search(partWithPrint.staves[1], 0, Type.Print)[0]._snapshot;
    }

    throw new Error(
      "Part does not contain a Print element at division 0. Is it validated?",
    );
  }

  renderToStaticMarkup(startMeasure: number): string {
    const core = renderToStaticMarkup(
      this.__getPage(startMeasure, false, "svg-export", null, false),
    );

    return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>${core
      .replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"')
      .replace(/class="tn_"/g, "font-family='Alegreya'")
      .replace(
        /class="mmn_"/g,
        "font-family='Alegreya' " + "font-style='italic' stroke='#7a7a7a'",
      )
      .replace(
        /class="bn_"/g,
        "font-family='Alegreya' " +
          "font-style='italic' text-anchor='end' stroke='#7a7a7a'",
      )
      .replace(/<noscript><\/noscript>/g, "")}`;
  }

  /**
   * INTERNAL. Renders a page. Instead, use renderToStaticMarkup() or the
   * functions provided in Song.
   *
   * Invariant: document must be validated.
   */
  __getPage(
    startMeasure: number,
    preview: boolean,
    renderTarget?: "svg-web" | "svg-export",
    pageClassName?: string,
    singleLineMode?: boolean,
    fixedMeasureWidth?: number,
    onOperationsAppended?: (ops: IAny[]) => void,
    ref?: (svg: SVGSVGElement) => void,
    onPageHeightChanged?: (height: number) => void,
  ): ReactElement<any> {
    const opts: ILayoutOptions = {
      document: this,
      attributes: {},
      debug: true,
      header: this.header,
      lineCount: NaN, // YYY
      lineIndex: NaN, // YYY
      measures: this.measures,
      modelFactory: this._factory,
      postprocessors: this._factory.postprocessors,
      preprocessors: [],
      print: this.getPrint(startMeasure),
      preview,
      singleLineMode,
      fixedMeasureWidth,
      fixup: onOperationsAppended
        ? (_segment, patch) => {
            onOperationsAppended(patch);
          }
        : null,
    };

    validate(opts);
    // Print snapshot may have been changed.
    opts.print = this.getPrint(startMeasure);
    const lineLayouts = layoutSong(opts);

    return (
      <PageView
        className={pageClassName}
        lineLayouts={lineLayouts}
        print={opts.print}
        renderTarget={renderTarget}
        scoreHeader={this.header}
        singleLineMode={singleLineMode}
        svgRef={ref}
        onPageHeightChanged={onPageHeightChanged}
      />
    );
  }

  constructor(
    header: ScoreHeader,
    measures: IMeasure[],
    _parts: string[],
    internalFactory: IFactory,
    error?: Error,
  ) {
    if (error) {
      this.error = error;
      return;
    }
    this.header = header;
    this.measures = measures;
    this._factory = internalFactory;
  }

  cleanlinessTracking: ICleanlinessTracking = {
    measures: {},
    lines: [],
    linePlacementHints: null,
  };
}
