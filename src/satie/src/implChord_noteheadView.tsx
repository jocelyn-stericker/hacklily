// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

import * as PropTypes from "prop-types";
import * as React from "react";
import { Component } from "react";

import type { Position, Notehead } from "#/musicxml-interfaces";

import Glyph from "./private_views_glyph";

export interface IProps {
  key?: string | number;
  spec: Notehead | Position;
  notehead: string;
}

/**
 * Renders a notehead.
 */
export default class NoteheadView extends Component<IProps, {}> {
  static contextTypes = {
    originY: PropTypes.number.isRequired,
  } as any;

  declare context: {
    originY: number;
  };

  render(): any {
    const spec = this.props.spec;
    const pos = spec as Position;
    const head = spec as Notehead;

    return (
      <Glyph
        fill={head.color}
        glyphName={this.props.notehead}
        // scale: this.props.grace ? 0.6 : 1.0,
        x={pos.defaultX + (pos.relativeX || 0)}
        y={this.context.originY - pos.defaultY - (pos.relativeY || 0)}
      />
    );
  }
}
