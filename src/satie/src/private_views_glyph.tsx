// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

import * as PropTypes from "prop-types";
import * as React from "react";
import { Component } from "react";

import { toPathData } from "./private_fontManager";
import { getGlyphCode } from "./private_smufl";

export interface IProps {
  key?: string | number;
  fill: string;
  glyphName: string;
  "selection-info"?: string;
  transform?: string;
  x: number;
  y: number;
  opacity?: number;
  code?: string;
  scale?: number;
}

/**
 * Most musical elements are rendered as glyphs. Exceptions include
 * slurs, ties, dots in dotted notes, ledger lines, and stave lines.
 */
export default class Glyph extends Component<IProps, {}> {
  static contextTypes = {
    renderTarget: PropTypes.oneOf(["svg-web", "svg-export"]),
  } as any;

  declare context: {
    renderTarget?: "svg-web" | "svg-export";
  };

  render(): JSX.Element {
    const px = this.props.x;
    const py = this.props.y;

    if (this.context.renderTarget === "svg-export") {
      const pathData = toPathData(
        "Bravura",
        getGlyphCode(this.props.glyphName),
        px,
        py,
        40 * (this.props.scale || 1),
      );
      return <path d={pathData} />;
    }

    const text = (
      <text
        className="mn_"
        fill={this.props.fill}
        fillOpacity={this.props.opacity}
        fontSize={40 * (this.props.scale || 1)}
        strokeOpacity={this.props.opacity}
        transform={this.props.transform}
        x={px}
        y={py}
      >
        {getGlyphCode(this.props.glyphName)}
      </text>
    );

    return text;
  }
}
