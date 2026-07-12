// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

import * as PropTypes from "prop-types";
import * as React from "react";
import { Component } from "react";

import type { Clef } from "#/musicxml-interfaces";
import { SymbolSize } from "#/musicxml-interfaces";

import { bboxes } from "./private_smufl";
import Glyph from "./private_views_glyph";

/**
 * Responsible for the rendering of a clef.
 */
export default class ClefView extends Component<
  { spec: Clef; key?: string | number },
  {}
> {
  static contextTypes = {
    originY: PropTypes.number,
  } as any;

  declare context: {
    originY: number;
  };

  render(): any {
    const spec = this.props.spec;

    if (spec.printObject === false) {
      return null;
    }

    const clefX = spec.defaultX + (spec.relativeX || 0);
    const clefY =
      (this.context.originY || 0) -
      (spec.defaultY + (spec.relativeY || 0) + (this.renderedLine() - 3) * 10);
    const clefSign = this.sign();

    if (!clefSign) {
      return null;
    }

    const clefGlyph = (
      <Glyph fill={spec.color} glyphName={clefSign} x={clefX} y={clefY} />
    );

    const clefOctaveChange = parseInt(spec.clefOctaveChange, 10);
    const clefDecorations: any[] = [];

    const clefSignBox = bboxes[clefSign];
    let left = clefSignBox[0];
    let top = clefSignBox[1];
    let right = clefSignBox[2];
    let bottom = clefSignBox[3]; // The linter doesn't like destructuring yet :(

    // We want it to actually touch, not just be outside the bbox
    const bScalingFactor = spec.sign.toUpperCase() === "F" ? 0.7 : 1;
    const topLeftOffset = spec.sign.toUpperCase() === "G" ? left * 2 : 0;
    top = -top * 10 + clefY;
    bottom = -bottom * 10 * bScalingFactor + clefY;
    left = left * 10 + clefX;
    right = right * 10 + clefX;

    const decorativeX = (left + right) / 2;
    if (clefOctaveChange === 2) {
      clefDecorations.push(
        <Glyph
          fill={spec.color}
          glyphName="clef15"
          key="15ma"
          x={
            decorativeX -
            (bboxes["clef15"][0] * 10 + bboxes["clef15"][2] * 10) / 2 +
            topLeftOffset
          }
          y={top}
        />,
      );
    } else if (clefOctaveChange === 1) {
      clefDecorations.push(
        <Glyph
          fill={spec.color}
          glyphName="clef8"
          key="8va"
          x={
            decorativeX -
            (bboxes["clef8"][0] * 10 + bboxes["clef8"][2] * 10) / 2 +
            topLeftOffset
          }
          y={top}
        />,
      );
    } else if (clefOctaveChange === -1) {
      clefDecorations.push(
        <Glyph
          fill={spec.color}
          glyphName="clef8"
          key="8vb"
          x={
            decorativeX -
            (bboxes["clef8"][0] * 10 + bboxes["clef8"][2] * 10) / 2
          }
          y={bottom + bboxes["clef8"][1] * 10}
        />,
      );
    } else if (clefOctaveChange === -2) {
      clefDecorations.push(
        <Glyph
          fill={spec.color}
          glyphName="clef15"
          key="15mb"
          x={
            decorativeX -
            (bboxes["clef15"][0] * 10 + bboxes["clef15"][2] * 10) / 2
          }
          y={bottom + bboxes["clef15"][1] * 10}
        />,
      );
    }
    if (clefDecorations) {
      return (
        <g>
          {clefGlyph}
          {clefDecorations}
        </g>
      );
    } else {
      return clefGlyph;
    }
  }

  sign() {
    const clef = this.props.spec.sign.toLowerCase();

    if (clef === "percussion") {
      return "unpitchedPercussionClef1";
    } else if (clef === "tab") {
      return "6stringTabClef";
    } else if (clef === "none") {
      return null;
    } else {
      return (
        clef +
        "Clef" +
        (this.props.spec.size === SymbolSize.Cue ? "Change" : "")
      );
    }
  }

  renderedLine(): number {
    // The TAB glyph is higher than expected.
    if (this.props.spec.sign.toLowerCase() === "tab") {
      return this.props.spec.line - 2;
    }
    return this.props.spec.line;
  }
}
