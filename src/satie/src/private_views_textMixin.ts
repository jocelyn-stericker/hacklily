// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

import type { CreditWords, Words } from "#/musicxml-interfaces";
import { DirectionMode, LeftCenterRight } from "#/musicxml-interfaces";

import { cssSizeToTenths } from "./private_renderUtil";

const DEF_SPACING = 4;
const V_SPACING = 4;

export interface ITextMixin {
  getTextAnchor(
    words: CreditWords | Words,
  ): "start" | "middle" | "end" | "inherit" | undefined;
  getTextDecoration(words: CreditWords | Words): string;
  getTransform(words: CreditWords | Words): string;
  getDirection(words: CreditWords | Words): string;
  getX(lineNum: number): number;
  getDX(words: CreditWords | Words, initX: number, lineNum: number): number;
  getDY(words: CreditWords | Words, initY: number, lineNum: number): number;
}

export const Prototype: ITextMixin = {
  getDX: function (words: CreditWords, initX: number, lineNum: number) {
    if (lineNum > 0) {
      return undefined;
    }
    const x = words.defaultX;
    if (!isNaN(x)) {
      return x + (words.relativeX || 0) - initX;
    }
    return DEF_SPACING;
  },
  getDY: function (words: CreditWords, initY: number, lineNum: number) {
    if (lineNum > 0) {
      return V_SPACING + cssSizeToTenths(this.context.scale40, words.fontSize);
    }
    if (words.defaultY || words.relativeY) {
      return (
        this.context.originY - (words.defaultY + (words.relativeY || 0)) - initY
      );
    }
    return 0;
  },
  getDirection: function (words: CreditWords | Words) {
    switch (words.dir) {
      case DirectionMode.Lro: // TODO: bidi
      case DirectionMode.Ltr:
        return "ltr";

      case DirectionMode.Rlo: // TODO: bidi
      case DirectionMode.Rtl:
        return "rtl";

      default:
        return "inherit";
    }
  },
  getTextAnchor: function (words: CreditWords | Words) {
    switch (words.halign || words.justify) {
      case LeftCenterRight.Right:
        return "end";
      case LeftCenterRight.Center:
        return "middle";
      case LeftCenterRight.Left:
        return "start";
      default:
        return "inherit";
    }
  },
  getTextDecoration: function (words: CreditWords | Words) {
    if (words.underline) {
      return "underline";
    }
    if (words.overline) {
      return "overline";
    }
    if (words.lineThrough) {
      return "line-through";
    }
    return "none";
  },
  getTransform: function (words: CreditWords | Words) {
    if (words.rotation) {
      return `rotate(${words.rotation})`;
    }
    return undefined;
  },
  getX: function (lineNum: number) {
    if (lineNum > 0) {
      return 10;
    }
    return undefined;
  },
};
