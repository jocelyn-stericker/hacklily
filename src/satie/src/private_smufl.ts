// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

/* eslint-disable no-shadow */

import { keyBy, memoize } from "lodash";

import bravura from "./private_smufl_bravura";
import glyphNames from "./private_smufl_glyphnames";

export { default as bravura } from "./private_smufl_bravura";
export const bboxes: { [key: string]: any[] } = keyBy(
  bravura.glyphBBoxes,
  4,
) as any;
bboxes["noteheadNull"] = bboxes["noteheadBlack"];

const _getGlyphCode = memoize(function getGlyphCode(name: string) {
  if (!(name in glyphNames)) {
    console.warn(name, " is not a valid glyph");
  }
  return glyphNames[name];
});

export function getGlyphCode(name: string) {
  return _getGlyphCode(name);
}

const getAnchor = memoize(
  (notehead: string) => bravura.glyphsWithAnchors[notehead],
);

/**
 * Calculates where a notation should begin.
 */
export function getFontOffset(notehead: string, direction: number) {
  const anchors = getAnchor(notehead);

  switch (true) {
    case !anchors:
      return [0, 0];
    case direction === 1:
      return anchors.stemUpSE || anchors.stemUpNW;
    case direction === -1:
      return anchors.stemDownNW || anchors.stemDownSW;
    default:
      throw new Error("Invalid direction");
  }
}

export const distances = {
  beam: 0.88,
  hyphen: 12,
};

export function getWidth(glyph: string) {
  const box = bboxes[glyph];
  return box ? box[0] * 10 - box[2] * 10 : 0;
}

export function getRight(glyph: string) {
  const box = bboxes[glyph];
  return box ? box[0] * 10 : undefined;
}

export function getLeft(glyph: string) {
  const box = bboxes[glyph];
  return box ? box[2] * 10 : undefined;
}

export function getTop(glyph: string) {
  const box = bboxes[glyph];
  return box ? box[1] * 10 : undefined;
}

export function getBottom(glyph: string) {
  const box = bboxes[glyph];
  return box ? box[3] * 10 : undefined;
}
