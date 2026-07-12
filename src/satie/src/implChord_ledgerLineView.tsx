// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

import * as PropTypes from "prop-types";
import React, { Component } from "react";

import type { PrintStyle } from "#/musicxml-interfaces";

import { bboxes } from "./private_smufl";
import Line from "./private_views_line";

export interface IProps {
  key?: string | number;
  spec: PrintStyle;
  notehead: string;
}

/**
 * Renders a ledger line at (x, y + line).
 */
export default class LedgerLine extends Component<IProps, {}> {
  static contextTypes = {
    originY: PropTypes.number.isRequired,
  } as any;

  declare context: {
    originY: number;
  };

  render(): any {
    const spec = this.props.spec;
    const west = bboxes[this.props.notehead][3];
    const east = bboxes[this.props.notehead][0];
    const xOffset = (east - west) * 10;
    return (
      <Line
        stroke={spec.color}
        strokeWidth={2.2}
        // Ledger lines should be thicker than regular lines.
        x1={spec.defaultX + (spec.relativeX || 0) - 3.2}
        x2={spec.defaultX + (spec.relativeX || 0) + xOffset - 0.2}
        y1={this.context.originY - spec.defaultY - (spec.relativeX || 0)}
        y2={this.context.originY - spec.defaultY - (spec.relativeX || 0)}
      />
    );
  }
}
