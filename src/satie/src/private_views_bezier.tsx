/**
 * This file is part of Satie music engraver <https://github.com/emilyskidsister/satie>.
 * Copyright (C) Jocelyn Stericker <jocelyn@nettek.ca> 2015 - present.
 *
 * Satie is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * Satie is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Satie.  If not, see <http://www.gnu.org/licenses/>.
 */

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
