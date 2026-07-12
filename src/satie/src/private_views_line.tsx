// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

import * as React from "react";
import type { FC } from "react";

export interface IProps {
  key?: string | number;
  className?: string;
  stroke: string;
  strokeWidth: number;
  x1: number;
  x2: number;
  y1: number;
  y2: number;
}

/**
 * Renders a straight line.
 */
const Line: FC<IProps> = (props) => {
  return (
    <line
      className={props.className}
      stroke={props.stroke}
      strokeWidth={props.strokeWidth}
      x1={props.x1}
      x2={props.x2}
      y1={props.y1}
      y2={props.y2}
    />
  );
};

export default Line;
