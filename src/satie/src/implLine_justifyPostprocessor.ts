// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

/* eslint-disable @typescript-eslint/prefer-for-of */
/* eslint-disable no-shadow */

import { reduce, map, max, times, last, forEach } from "lodash";

import { barDivisions } from "./private_chordUtil";
import type { ILayoutOptions } from "./private_layoutOptions";
import type { ILineBounds } from "./private_lineBounds";
import type { IMeasureLayout } from "./private_measureLayout";
import { scoreParts } from "./private_part";
import { MAX_SAFE_INTEGER } from "./private_util";

const UNDERFILLED_EXPANSION_WEIGHT = 0.1;

/**
 * Evaluates S(t), the logistic function. Used to create aesthetic transitions.
 * For example, the upper half of the logistic function is used to compute how much
 * spacing should be on the final line of a song.
 */
function logistic(t: number) {
  return 1 / (1 + Math.exp(-t));
}

/**
 * Lays out measures within a bar & justifies.
 *
 * @returns new end of line
 */
function justify(
  options: ILayoutOptions,
  bounds: ILineBounds,
  measures: IMeasureLayout[],
): IMeasureLayout[] {
  if (options.singleLineMode && !options.fixedMeasureWidth) {
    // Skip: note that in this case, we set the shortestCount in each measure to half what it
    // needs to be to fake justification in each measure.
    return measures;
  }

  const x =
    bounds.left + reduce(measures, (sum, measure) => sum + measure.width, 0);

  // Check for underfilled bars
  const underfilled = map(measures, (measure, idx) => {
    const attr = measures[idx].attributes;
    const firstPart = scoreParts(options.header.partList)[0].id;
    const divs = barDivisions(attr[firstPart][1]);
    const maxDivs = measure.maxDivisions;
    return maxDivs < divs;
  });

  let smallest = Number.POSITIVE_INFINITY;
  forEach(measures, function (measure) {
    const maxIdx = max(map(measure.elements, (el) => el.length));
    times(maxIdx, function (j) {
      for (let i = 0; i < measure.elements.length; ++i) {
        if (measure.elements[i][j].expandPolicy !== "none") {
          if (
            measure.elements[i][j].model &&
            measure.elements[i][j].model.divCount
          ) {
            smallest = Math.min(
              measure.elements[i][j].model.divCount,
              smallest,
            );
          }
        }
      }
    });
  });

  // x > enX is possible if a single bar's minimum size exceeds maxX, or if our
  // guess for a measure width was too liberal. In either case, we're shortening
  // the measure width here, and our partial algorithm doesn't work with negative
  // padding.
  const partial =
    x < bounds.right && options.lineIndex + 1 === options.lineCount;
  let underfilledCount = 0;

  const expandableCount = reduce(
    measures,
    function (memo, measure$, idx) {
      // Precondition: all layouts at a given index have the same "expandable" value.
      return reduce(
        last(measure$.elements),
        function (memo, element$) {
          if (underfilled[idx] && element$.expandPolicy !== "none") {
            ++underfilledCount;
          }
          if (!element$.model || !element$.model.divCount) {
            return memo;
          }
          let expandBy = 0;

          if (element$.expandPolicy !== "none") {
            expandBy =
              Math.log(element$.model.divCount) - Math.log(smallest) + 1;
          }

          return (
            memo +
            expandBy * (underfilled[idx] ? UNDERFILLED_EXPANSION_WEIGHT : 1.0)
          );
        },
        memo,
      );
    },
    0,
  );

  let avgExpansion: number;
  if (!expandableCount) {
    // case 1: nothing to expand
    avgExpansion = 0;
  } else if (partial) {
    // case 2: expanding, but not full width
    const expansionRemainingGuess = bounds.right - 3 - x;
    const avgExpansionGuess =
      expansionRemainingGuess /
      (expandableCount + (1 - UNDERFILLED_EXPANSION_WEIGHT) * underfilledCount);
    const weight =
      (logistic((avgExpansionGuess - bounds.right / 80) / 20) * 2) / 3;
    avgExpansion = (1 - weight) * avgExpansionGuess;
  } else {
    // case 3: expanding or contracting to full width
    const exp = bounds.right - x;
    avgExpansion = exp / expandableCount;
  }

  let lineExpansion = 0;
  forEach(measures, function (measure, measureIdx) {
    measure.originX += lineExpansion;

    let measureExpansion = 0;
    const maxIdx = max(map(measure.elements, (el) => el.length));

    if (options.fixedMeasureWidth) {
      const expandable = times(maxIdx, function (j) {
        let expand = false;
        for (let i = 0; i < measure.elements.length; ++i) {
          if (measure.elements[i][j].expandPolicy !== "none") {
            expand = true;
          }
        }
        return expand;
      });
      const count = expandable.filter((n) => n).length;
      const expansionPerElement =
        (options.fixedMeasureWidth - measure.width) / count;
      times(maxIdx, function (j) {
        for (let i = 0; i < measure.elements.length; ++i) {
          measure.elements[i][j].x += measureExpansion;
        }
        if (expandable[j]) {
          measureExpansion += expansionPerElement;
        }
      });
    } else {
      times(maxIdx, function (j) {
        for (let i = 0; i < measure.elements.length; ++i) {
          measure.elements[i][j].x += measureExpansion;
        }
        let expandOne = false;
        let minRatio = MAX_SAFE_INTEGER;
        for (let i = 0; i < measure.elements.length; ++i) {
          if (measure.elements[i][j].expandPolicy !== "none") {
            if (
              !measure.elements[i][j].model ||
              !measure.elements[i][j].model.divCount
            ) {
              continue;
            }

            const divCount = measure.elements[i][j].model.divCount;
            const ratio =
              (Math.log(divCount) - Math.log(smallest) + 1) *
              (underfilled[measureIdx] ? UNDERFILLED_EXPANSION_WEIGHT : 1.0);

            minRatio = Math.min(minRatio, ratio);
            expandOne = true;
          }
        }
        if (expandOne) {
          // FIXME: We can overshoot, like on Lily 23f.
          measureExpansion += avgExpansion * minRatio;
        }
      });
    }

    measure.width += measureExpansion;
    lineExpansion += measureExpansion;
  });

  return measures;
}

export default justify;
