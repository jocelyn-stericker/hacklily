// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

import type { ScoreHeader, Print } from "#/musicxml-interfaces";
import type { IAny } from "#/musicxml-interfaces/operations";

import type { Document, IMeasure, ISegment } from "./document";
import type { IAttributesSnapshot } from "./private_attributesSnapshot";
import type {
  IFactory,
  IPreprocessor,
  IPostprocessor,
} from "./private_factory";

export type IFixupFn = (
  segment: ISegment,
  operations: IAny[],
  restartRequired?: boolean,
) => void;

export interface ILayoutOptions {
  attributes: { [part: string]: IAttributesSnapshot[] };
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
