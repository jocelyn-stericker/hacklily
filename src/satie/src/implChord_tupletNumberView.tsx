// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

/* eslint-disable no-shadow */

/**
 * @file Renders a tuplet number, for tuplets in beams and unbeamed tuplets.
 */

import { last, map, reduce } from "lodash";
import * as React from "react";
import type { FC } from "react";

import type { Tuplet } from "#/musicxml-interfaces";
import { AboveBelow } from "#/musicxml-interfaces";

import { bboxes } from "./private_smufl";
import Glyph from "./private_views_glyph";

export interface IProps {
  tuplet: Tuplet;
  x1: number;
  x2: number;
  y1: number;
  y2: number;
}

const TupletNumber: FC<IProps> = (props) => {
  const { x1, x2, y1, y2, tuplet } = props;
  const { placement } = tuplet;

  const text = tuplet.tupletActual.tupletNumber.text;
  const symbols = map(text, (char) => `tuplet${char}`);
  const boxes = map(symbols, (symbol) => bboxes[symbol]);
  const widths = map(boxes, (box) => (box[0] - box[2]) * 10);

  const width = reduce(widths, (total, width) => total + width, 0);
  const offset = (x1 + x2) / 2;
  const xs = reduce(
    boxes,
    (memo, box) => {
      memo.push(box[0] * 10 + last(memo));
      return memo;
    },
    [0],
  );
  const y = (y1 + y2) / 2 + (placement === AboveBelow.Above ? 7.5 : 9.5);

  return (
    <g>
      {/* Mask
     FIXME: We should instead split up the rectangle into
     two parts to avoid breaking transparent backgrounds! */}
      <polygon
        fill="white"
        key="mask"
        points={
          offset -
          width / 2 -
          6 +
          "," +
          (y - boxes[0][1] * 10) +
          " " +
          (offset - width / 2 - 6) +
          "," +
          (y + boxes[0][3] * 10) +
          " " +
          (offset + width / 2 + 6) +
          "," +
          (y + boxes[0][3] * 10) +
          " " +
          (offset + width / 2 + 6) +
          "," +
          (y - boxes[0][1] * 10)
        }
        stroke="white"
        strokeWidth={0}
      />

      {/* Glyphs */}
      {map(symbols, (sym, index) => {
        return (
          <Glyph
            key={`glyph${index}`}
            fill="#000000"
            glyphName={sym}
            x={xs[index] + offset - width / 2}
            y={y}
          />
        );
      })}
    </g>
  );
};

export default TupletNumber;
