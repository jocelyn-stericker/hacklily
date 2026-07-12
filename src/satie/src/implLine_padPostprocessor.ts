// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

/* eslint-disable @typescript-eslint/prefer-for-of */

import { forEach, max, map, times } from "lodash";

import type { ILayoutOptions } from "./private_layoutOptions";
import type { ILineBounds } from "./private_lineBounds";
import type { IMeasureLayout } from "./private_measureLayout";

/**
 * Respects the minSpaceBefore and minSpaceAfter of elements. minSpaceBefore and minSpaceAfter
 * are used for things like lyrics.
 *
 * @returns new end of line
 */
function pad(
  _options: ILayoutOptions,
  _bounds: ILineBounds,
  measures: IMeasureLayout[],
): IMeasureLayout[] {
  let measureOffset = 0;
  forEach(measures, function (measure) {
    measure.originX += measureOffset;

    const maxIdx = max(map(measure.elements, (el) => el.length));
    let previousElementEnd = -10;
    let offset = 0;
    times(maxIdx, function (j) {
      // These refer to the space needed before/after this position in all segments.
      let spaceNeededBefore = 0;
      let spaceNeededAfter = 0;

      for (let i = 0; i < measure.elements.length; ++i) {
        const spaceNeededBeforeSegment =
          measure.elements[i][j].minSpaceBefore || 0;
        const spaceNeededAfterSegment =
          measure.elements[i][j].minSpaceAfter || 0;

        spaceNeededBefore = Math.max(
          spaceNeededBefore,
          spaceNeededBeforeSegment,
        );
        spaceNeededAfter = Math.max(spaceNeededAfter, spaceNeededAfterSegment);
        measure.elements[i][j].x += offset;
      }
      if (!spaceNeededBefore && !spaceNeededAfter) {
        // TODO: we should instead have some sort of flag which means
        // "disregard this element"
        return;
      }
      const thisElementStart = measure.elements[0][j].x - spaceNeededBefore;
      const extraSpaceGiven = Math.max(
        0,
        previousElementEnd - thisElementStart,
      );

      if (extraSpaceGiven) {
        for (let i = 0; i < measure.elements.length; ++i) {
          measure.elements[i][j].x += extraSpaceGiven;
        }
      }
      offset += extraSpaceGiven;

      // Update for next iteration
      previousElementEnd = measure.elements[0][j].x + spaceNeededAfter;
    });
    measure.width += offset;
    measureOffset += offset;
  });

  // TODO(emilyskidsister): Equalize space as much as possible while fitting in line
  // TODO(emilyskidsister): Modify layout enging to make sure we don't end up overflowing
  //                 (in which case the Justify handler will squish things again)

  return measures;
}

export default pad;
