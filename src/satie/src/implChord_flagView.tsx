// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

import * as PropTypes from "prop-types";
import React, { Component } from "react";

import { getFontOffset } from "./private_smufl";
import Glyph from "./private_views_glyph";

export interface IProps {
  key?: string | number;
  spec: {
    defaultX: number;
    defaultY: number;
    color: string;
    flag: string;
    direction: number;
  };
  isGrace?: boolean;
  notehead: string;
  stemWidth: number;
  stemHeight: number;
}

/**
 * Responsible for rendering the "flag" on un-beamed notes shorter than quarter notes.
 */
export default class Flag extends Component<IProps, {}> {
  static contextTypes = {
    originY: PropTypes.number.isRequired,
  } as any;

  declare context: {
    originY: number;
  };

  render(): any {
    const spec = this.props.spec;
    const context = this.context;

    const xscale = this.props.isGrace ? 0.6 : 1.0;
    const dir = spec.direction;
    const fontOffsetX = getFontOffset(this.glyphName(), dir)[0] * xscale;
    const noteOffsetX = getFontOffset(this.props.notehead, dir)[0] * xscale;
    const noteOffsetY = getFontOffset(this.props.notehead, dir)[1] * 10;
    return (
      <Glyph
        fill={spec.color}
        glyphName={this.glyphName()}
        scale={this.props.isGrace ? 0.6 : 1.0}
        x={
          spec.defaultX +
          fontOffsetX * 10 +
          (dir === 1 ? noteOffsetX * 10 - this.props.stemWidth : 0)
        }
        y={context.originY - spec.defaultY - noteOffsetY * 4}
      />
    );
  }

  directionString() {
    if (this.props.spec.direction === 1) {
      return "Up";
    } else if (this.props.spec.direction === -1) {
      return "Down";
    }

    throw new Error("Invalid direction");
  }
  glyphName() {
    return this.props.spec.flag + this.directionString();
  }
}
