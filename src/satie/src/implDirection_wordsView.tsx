// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

/* eslint-disable no-shadow */

import invariant from "invariant";
import { map, extend } from "lodash";
import * as PropTypes from "prop-types";
import * as React from "react";
import { Component } from "react";

import type { Direction, CreditWords, Words } from "#/musicxml-interfaces";
import { NormalItalic, NormalBold } from "#/musicxml-interfaces";

import { cssSizeToTenths } from "./private_renderUtil";
import type { ITextMixin } from "./private_views_textMixin";
import { Prototype as TextMixin } from "./private_views_textMixin";

export interface IProps {
  layout: { model: Direction; overrideX?: number };
  key?: string | number;
}

export default class WordsView
  extends Component<IProps, {}>
  implements ITextMixin
{
  static contextTypes = {
    originY: PropTypes.number.isRequired,
    scale40: PropTypes.number.isRequired,
  } as any;

  declare context: {
    originY: number;
    scale40: number;
  };

  /* TextMixin.ITextMixin */
  declare getTextAnchor: (
    words: CreditWords | Words,
  ) => "start" | "middle" | "end" | "inherit" | undefined;
  declare getTextDecoration: (words: CreditWords | Words) => string;
  declare getTransform: (words: CreditWords | Words) => string;
  declare getDirection: (words: CreditWords | Words) => string;
  declare getX: (lineNum: number) => number;
  declare getDX: (
    words: CreditWords | Words,
    initX: number,
    lineNum: number,
  ) => number;
  declare getDY: (
    words: CreditWords | Words,
    initY: number,
    lineNum: number,
  ) => number;

  render(): any {
    const layout = this.props.layout;
    const model = layout.model;
    const wordsContainer = model.directionTypes.filter((dt) => dt.words)[0];
    invariant(!!wordsContainer, "No words found!");
    const words =
      typeof wordsContainer !== "number" &&
      typeof wordsContainer !== "function" &&
      wordsContainer.words;

    const initX = this.props.layout.overrideX;
    const initY =
      this.context.originY - words[0].defaultY - (words[0].relativeY || 0);
    const scale40 = this.context.scale40;

    return (
      <text x={initX} y={initY}>
        {map(words, (words, idx) => {
          const isBold = words.fontWeight === NormalBold.Bold;
          const isItalic = words.fontStyle === NormalItalic.Italic;
          const fontSize = cssSizeToTenths(scale40, words.fontSize);

          return map(words.data.split("\n"), (line, lineNum) => (
            <tspan
              alignmentBaseline="hanging"
              fill={words.color || "black"}
              direction={this.getDirection(words)}
              dx={this.getDX(words, 0, lineNum)}
              dy={this.getDY(words, initY, lineNum)}
              fontStyle={isItalic ? "italic" : "normal"}
              fontWeight={isBold ? "bold" : "normal"}
              fontFamily={words.fontFamily || "Alegreya"}
              fontSize={fontSize}
              key={idx + "l" + lineNum}
              letterSpacing={
                words.letterSpacing && words.letterSpacing !== "normal"
                  ? "" +
                    cssSizeToTenths(this.context.scale40, words.letterSpacing)
                  : "normal"
              }
              textDecoration={this.getTextDecoration(words)}
              textAnchor={this.getTextAnchor(words)}
              transform={this.getTransform(words)}
              x={this.getX(lineNum)}
            >
              {line}
            </tspan>
          ));
        })}
      </text>
    );
  }
}

extend(WordsView.prototype, TextMixin);
