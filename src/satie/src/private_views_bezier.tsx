// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

import * as React from "react";
import type { FC } from "react";

export interface IProps {
  fill: string;
  stroke: string;
  strokeWidth: number;
  x1: number;
  x2: number;
  x3: number;
  x4: number;
  x5: number;
  x6: number;
  y1: number;
  y2: number;
  y3: number;
  y4: number;
  y5: number;
  y6: number;
}

/**
 * Responsible for the rendering a bezier curve, such as a
 * slur or a tie.
 */
const Bezier: FC<IProps> = (props) => {
  return (
    <path
      d={
        "M" +
        props.x1 +
        "," +
        props.y1 +
        "C" +
        props.x2 +
        "," +
        props.y2 +
        " " +
        props.x3 +
        "," +
        props.y3 +
        " " +
        props.x4 +
        "," +
        props.y4 +
        " " +
        "C" +
        props.x5 +
        "," +
        props.y5 +
        " " +
        props.x6 +
        "," +
        props.y6 +
        " " +
        props.x1 +
        "," +
        props.y1
      }
      fill={props.fill}
      stroke={props.stroke}
      strokeWidth={props.strokeWidth}
    />
  );
};

export default Bezier;
