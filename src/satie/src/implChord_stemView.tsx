// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

import invariant from "invariant";
import * as PropTypes from "prop-types";
import * as React from "react";
import { Component } from "react";

import type { Stem, Tremolo } from "#/musicxml-interfaces";
import { StemType } from "#/musicxml-interfaces";

import { getFontOffset } from "./private_smufl";
import Glyph from "./private_views_glyph";
import Line from "./private_views_line";

export interface IProps {
  key?: string | number;
  spec: Stem;
  notehead: string;
  bestHeight: number;
  width: number;
  tremolo: Tremolo;
}

/**
 * Renders a stem based on a height decided in Note.
 */
export default class StemView extends Component<IProps, {}> {
  static contextTypes = {
    originY: PropTypes.number.isRequired,
  } as any;

  declare context: {
    originY: number;
  };

  render(): any {
    const { spec, notehead, tremolo, width } = this.props;
    const { defaultX, relativeX, defaultY, relativeY, color } = spec;
    if (spec.type === StemType.Double) {
      return null;
    }
    const direction = spec.type === StemType.Up ? 1 : -1; // TODO: StemType.Double
    const lineXOffset = (direction * -width) / 2;
    const offset = getFontOffset(notehead, direction) || [0];
    const x = defaultX + (relativeX || offset[0] * 10 + lineXOffset);
    invariant(isFinite(x), "Invalid x offset %s", x);

    const dY = this.props.bestHeight * direction;

    const elements: any[] = [];
    elements.push(
      <Line
        key="s"
        stroke={color}
        strokeWidth={width}
        x1={x}
        x2={x}
        y1={this.context.originY - defaultY - (relativeY || 0) - offset[1] * 10}
        y2={
          this.context.originY -
          defaultY -
          (relativeY || 0) -
          offset[1] * 10 -
          dY
        }
      />,
    );

    if (tremolo) {
      elements.push(
        <Glyph
          key="t"
          glyphName={`tremolo${tremolo.data || "1"}`}
          x={x}
          fill="black"
          y={this.context.originY - defaultY - (relativeY || 0) - (dY * 4) / 5}
        />,
      );
    }

    if (elements.length === 1) {
      return elements[0];
    } else {
      return <g>{elements}</g>;
    }
  }
}
