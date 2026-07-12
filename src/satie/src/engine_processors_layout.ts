// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

/* eslint-disable no-shadow */

import invariant from "invariant";
import { map, reduce, find, last } from "lodash";

import type { Print } from "#/musicxml-interfaces";

import type { IMeasure } from "./document";
import {
  getMeasureSegments,
  Type,
  reduceToShortestInSegments,
} from "./document";
import { layoutLine } from "./engine_processors_line";
import type { ILayoutOptions } from "./private_layoutOptions";
import { calculateLineBounds } from "./private_lineBounds";
import type { IMeasureLayout } from "./private_measureLayout";

const SQUISHINESS = 0.8;

export interface ILinePlacementHint {
  widthByShortest: { [key: number]: number };
  shortestCount: number;
  attributesWidthStart: number;
  attributesWidthEnd: number;
}

interface IReduceOptsMemo {
  options: ILayoutOptions;
  opts: ILayoutOptions[];
  remainingWidth: number;
  startingWidth: number;
  thisPrint: Print;
  widthAllocatedForEnd: number;
  widthAllocatedForStart: number;
  shortest: number;
}

function findPrint(options: ILayoutOptions, measure: IMeasure): Print {
  const partWithPrint = find(
    measure.parts,
    (part) =>
      !!part.staves[1] &&
      options.modelFactory.search(part.staves[1], 0, Type.Print).length > 0,
  );

  if (partWithPrint) {
    return options.modelFactory.search(
      partWithPrint.staves[1],
      0,
      Type.Print,
    )[0]._snapshot;
  }
  return null;
}

/**
 * Reducer that puts measures into lines.
 */
function assignLinesReducer(
  memo: IReduceOptsMemo,
  measureInfo: ILinePlacementHint,
  idx: number,
  all: ILinePlacementHint[],
): IReduceOptsMemo {
  const options = memo.options;
  const measures = options.measures;

  memo.thisPrint = findPrint(options, measures[idx]) || memo.thisPrint;
  if (!last(memo.opts).print) {
    last(memo.opts).print = memo.thisPrint;
  }
  invariant(!!memo.thisPrint, "No print found");
  if (!memo.options.singleLineMode) {
    if (measureInfo.attributesWidthStart > memo.widthAllocatedForStart) {
      memo.remainingWidth -=
        measureInfo.attributesWidthStart - memo.widthAllocatedForStart;
      memo.widthAllocatedForStart = measureInfo.attributesWidthStart;
    }
    if (measureInfo.attributesWidthEnd > memo.widthAllocatedForEnd) {
      memo.remainingWidth -=
        measureInfo.attributesWidthEnd - memo.widthAllocatedForEnd;
      memo.widthAllocatedForEnd = measureInfo.attributesWidthEnd;
    }
    let retroactiveIncrease = 0;
    if (memo.shortest > measureInfo.shortestCount) {
      const measuresOnLine = last(memo.opts).measures.length;
      const measuresInfo = all.slice(idx - measuresOnLine, idx);
      retroactiveIncrease = measuresInfo.reduce((increase, measure) => {
        return (
          measure.widthByShortest[measureInfo.shortestCount] -
          measure.widthByShortest[memo.shortest]
        );
      }, 0);
      memo.shortest = measureInfo.shortestCount;
    }
    const measureWidth = measureInfo.widthByShortest[memo.shortest];
    const totalIncrease = retroactiveIncrease + measureWidth;
    if (memo.remainingWidth > totalIncrease) {
      memo.remainingWidth -= totalIncrease;
    } else {
      memo.opts.push(createEmptyLayout(options, memo.thisPrint));
      memo.remainingWidth =
        memo.startingWidth -
        measureWidth -
        measureInfo.attributesWidthStart -
        measureInfo.attributesWidthEnd;
      memo.widthAllocatedForStart = measureInfo.attributesWidthStart;
      memo.widthAllocatedForEnd = measureInfo.attributesWidthEnd;
    }
  }

  last(memo.opts).measures.push(measures[idx]);

  return memo;
}

function createEmptyLayout(
  options: ILayoutOptions,
  print: Print,
): ILayoutOptions {
  return {
    ...options,
    attributes: null,
    measures: [],
    print: print,
  };
}

export function getApproximateMeasureWidth(
  measure: IMeasure,
  shortest: number,
) {
  return Object.keys(measure.parts).reduce((pwidth, partName) => {
    const vwidth = measure.parts[partName].voices.reduce((vwidth, voice) => {
      if (!voice) {
        return vwidth;
      }
      return voice.reduce(
        (swidth, el) => swidth + el.calcWidth(shortest),
        vwidth,
      );
    }, 0);
    return Math.max(vwidth, pwidth);
  }, 0);
}

function getLinePlacementHints(
  measures: IMeasure[],
): ReadonlyArray<ILinePlacementHint> {
  const shortestByMeasure: ReadonlyArray<number> = measures.map((measure) => {
    const segments = getMeasureSegments(measure);
    return reduce(segments, reduceToShortestInSegments, Number.MAX_VALUE);
  });

  const shortestsObj: {
    readonly [key: number]: boolean;
  } = shortestByMeasure.reduce(
    (shortests, shortest) => {
      shortests[shortest] = true;
      return shortests;
    },
    {} as { [key: number]: boolean },
  );

  const shortests = Object.keys(shortestsObj).map((str) => parseInt(str, 10));

  return map(
    measures,
    function layoutMeasure(measure, idx): ILinePlacementHint {
      const shortestInMeasure = shortestByMeasure[idx];

      const numericMeasureWidth =
        !isNaN(measure.width) && measure.width !== null;
      if (
        numericMeasureWidth &&
        (measure.width <= 0 || !isFinite(measure.width))
      ) {
        console.warn("Bad measure width %s. Ignoring", measure.width);
      }
      const widthByShortest = shortests.reduce(
        (shortests, shortest) => {
          if (shortest <= shortestInMeasure) {
            shortests[shortest] = getApproximateMeasureWidth(measure, shortest);
          }
          return shortests;
        },
        {} as { [key: number]: number },
      );

      // XXX: multiple rests
      return {
        widthByShortest,
        shortestCount: shortestInMeasure,
        attributesWidthStart: 150, // XXX
        attributesWidthEnd: 50, // XXX
      };
    },
  );
}

export default function layoutSong(
  options: ILayoutOptions,
): IMeasureLayout[][] {
  invariant(!!options.print, "Print not defined");
  invariant(
    !options.print._snapshot,
    "Pass a snapshot of Print to layoutSong, not the actual model!",
  );
  const page = 1; // XXX
  const scaling = options.document.header.defaults.scaling;

  // Estimate the width of each measure, and the space available for each line.
  const boundsGuess = calculateLineBounds(options.print, page, scaling);
  const lineWidth = (boundsGuess.right - boundsGuess.left) / SQUISHINESS;
  const linePlacementHints = options.preview
    ? options.document.cleanlinessTracking.linePlacementHints
    : getLinePlacementHints(options.measures);

  options.document.cleanlinessTracking.linePlacementHints = linePlacementHints;

  // Assign measures to lines.
  const layoutOpts = reduce(linePlacementHints, assignLinesReducer, {
    options: options,
    opts: <ILayoutOptions[]>[createEmptyLayout(options, options.print)],
    remainingWidth: lineWidth,
    shortest: Number.MAX_VALUE,
    startingWidth: lineWidth,
    thisPrint: options.print,
    widthAllocatedForEnd: 0,
    widthAllocatedForStart: 0,
  }).opts;

  layoutOpts.forEach((line, idx) => {
    line.lineIndex = idx;
    line.lineCount = layoutOpts.length;
    line.attributes = {};
  });

  if (!options.preview) {
    const oldLineCleanliness = options.document.cleanlinessTracking.lines || [];
    const newLineCleanliness =
      layoutOpts.map((line) => line.measures.map((measure) => measure.uuid)) ||
      [];
    for (
      let i = 0;
      i < oldLineCleanliness.length || i < newLineCleanliness.length;
      ++i
    ) {
      const oldLine = oldLineCleanliness[i] || [];
      const newLine = newLineCleanliness[i] || [];
      const isDirty =
        !oldLine ||
        !newLine ||
        oldLine.length !== newLine.length ||
        oldLine.some((m, k) => newLine[k] !== m);
      if (isDirty) {
        oldLine.concat(newLine).forEach((m) => {
          options.document.cleanlinessTracking.measures[m] = null;
        });
      }
    }
    options.document.cleanlinessTracking.lines = newLineCleanliness;
  }

  // Create the final layout
  const memo = {
    y: calculateLineBounds(layoutOpts[0].print, page, scaling).top,
    attributes: {},
  };
  return layoutOpts.map((lineOpt) =>
    layoutLine(
      lineOpt,
      calculateLineBounds(lineOpt.print, page, scaling),
      memo,
    ),
  );
}
