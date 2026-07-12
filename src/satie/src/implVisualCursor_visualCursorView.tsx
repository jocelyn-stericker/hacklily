// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

import * as PropTypes from "prop-types";
import type { ReactElement } from "react";
import React, { Component } from "react";

import type { IVisualCursorLayout } from "./implVisualCursor_visualCursorModel";
import Line from "./private_views_line";

export interface IProps {
  layout: IVisualCursorLayout;
}

export default class VisualCursorView extends Component<IProps, {}> {
  static contextTypes = {
    originY: PropTypes.number.isRequired,
    systemBottom: PropTypes.number.isRequired,
    systemTop: PropTypes.number.isRequired,
  } as any;

  declare context: {
    originY: number;
    systemBottom: number;
    systemTop: number;
  };

  render(): ReactElement<any> {
    const layout = this.props.layout;
    const x = layout.x;

    const yTop = this.context.systemTop;
    const yBottom = this.context.systemBottom;
    const height = yTop - yBottom;

    return (
      <Line
        stroke="#428bca"
        strokeWidth={2}
        x1={x - 4}
        x2={x - 4}
        y1={yTop + height * 0.5}
        y2={yBottom - height * 0.5}
      />
    );
  }
}
