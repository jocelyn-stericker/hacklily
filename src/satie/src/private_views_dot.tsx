// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

import * as React from "react";
import type { FC } from "react";

export interface IProps {
  key?: number | string;
  x: number;
  y: number;
  radius: number;
  fill: string;
}

/**
 * Responsible for the rendering of a dot as part of a dotted note.
 * This is not used to render staccatos.
 */
const Dot: FC<IProps> = (props) => {
  // See rationale for hidden rect in _glyph.jsx
  return (
    <g>
      <circle cx={props.x} cy={props.y} fill={props.fill} r={props.radius} />
    </g>
  );
};

export default Dot;
