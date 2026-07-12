// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

/* eslint-disable no-shadow */

import invariant from "invariant";
import { map, extend } from "lodash";
import * as PropTypes from "prop-types";
import * as React from "react";
import { Component } from "react";

import type { Credit, CreditWords, Words } from "#/musicxml-interfaces";
import { NormalItalic, NormalBold } from "#/musicxml-interfaces";

import { cssSizeToTenths } from "./private_renderUtil";
import type { ITextMixin } from "./private_views_textMixin";
import { Prototype as TextMixin } from "./private_views_textMixin";

export default class CreditView
  extends Component<Credit, {}>
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

  /* ITextMixin */
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
    const image = this.props.creditImage;
    const words = this.props.creditWords;
    const scale40 = this.context.scale40;
    invariant(!image, "Not implemented"); // There is either words or image, but not both
    invariant(!!words, "Unknown component type");

    if (!!words && !words.length) {
      return <g />;
    }
    const initX = words[0].defaultX + (words[0].relativeX || 0);
    const initY =
      this.context.originY - (words[0].defaultY + (words[0].relativeY || 0));

    return (
      <text x={initX} y={initY}>
        {map(words, (words, idx) => {
          const isItalic = words.fontStyle === NormalItalic.Italic;
          const isBold = words.fontWeight === NormalBold.Bold;
          const fontSize = cssSizeToTenths(scale40, words.fontSize);
          return map(words.words.split("\n"), (line, lineNum) => (
            <tspan
              alignmentBaseline="hanging"
              fill={words.color || "black"}
              direction={this.getDirection(words)}
              dx={this.getDX(words, initX, lineNum as any)}
              dy={this.getDY(words, initY, lineNum as any)}
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

extend(CreditView.prototype, TextMixin);
