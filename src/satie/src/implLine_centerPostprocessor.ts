// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

/* eslint-disable @typescript-eslint/prefer-for-of */

import invariant from "invariant";
import { forEach, max, map, times, findIndex, last } from "lodash";

import { Type } from "./document";
import type { ILayoutOptions } from "./private_layoutOptions";
import type { ILineBounds } from "./private_lineBounds";
import type { IMeasureLayout } from "./private_measureLayout";

/**
 * Centers elements marked as such
 *
 * @returns new end of line
 */
function center(
  options: ILayoutOptions,
  bounds: ILineBounds,
  measures: IMeasureLayout[],
): IMeasureLayout[] {
  forEach(measures, function (measure, measureIdx) {
    const maxIdx = max(map(measure.elements, (el) => el.length));
    times(maxIdx, function (j) {
      for (let i = 0; i < measure.elements.length; ++i) {
        if (measure.elements[i][j].expandPolicy === "centered") {
          const intrinsicWidth = measure.elements[i][j].renderedWidth;
          invariant(
            isFinite(intrinsicWidth),
            "Intrinsic width must be set on centered items",
          );
          let measureSpaceRemaining: number;
          const attribIdx = findIndex(
            measure.elements[0],
            (el) => el.renderClass === Type.Attributes && el.renderedWidth > 0,
          );
          let base = 0;
          if (attribIdx !== -1 && attribIdx < j) {
            base =
              measure.elements[0][attribIdx].overrideX +
              measure.elements[0][attribIdx].renderedWidth;
            measureSpaceRemaining = last(measure.elements[i]).overrideX - base;
          } else if (measures[measureIdx - 1]) {
            measureSpaceRemaining =
              last(measure.elements[i]).overrideX -
              (measures[measureIdx - 1].width -
                last(measures[measureIdx - 1].elements[0]).overrideX);
          } else {
            measureSpaceRemaining = last(measure.elements[i]).overrideX;
          }
          if (
            measures[measureIdx + 1] &&
            measures[measureIdx + 1].width === 0
          ) {
            measureSpaceRemaining += 16.6;
          }
          measure.elements[i][j].x =
            base + measureSpaceRemaining / 2 - intrinsicWidth / 2;
        }
      }
    });
  });

  return measures;
}

export default center;
