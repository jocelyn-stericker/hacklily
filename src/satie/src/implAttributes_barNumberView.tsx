// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

import * as PropTypes from "prop-types";
import * as React from "react";
import { Component } from "react";

import type { Position } from "#/musicxml-interfaces";

export interface IProps {
  spec: Position;
  barNumber: string;
  key?: string | number;
}

export default class BarNumber extends Component<IProps, {}> {
  static contextTypes = {
    originY: PropTypes.number.isRequired,
  } as any;

  declare context: {
    originY: number;
  };

  render(): any {
    const spec = this.props.spec;
    return (
      <text
        className="bn_"
        fontSize={24}
        x={spec.defaultX + (spec.relativeX || 0)}
        y={this.context.originY - spec.defaultY - (spec.relativeY || 0)}
      >
        {this.props.barNumber}
      </text>
    );
  }
}
