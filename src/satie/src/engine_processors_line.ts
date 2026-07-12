// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

/* eslint-disable no-shadow */

import invariant from "invariant";
import { reduce, map, times, maxBy, zipObject, forEach } from "lodash";

import { getMeasureSegments, reduceToShortestInSegments } from "./document";
import { layoutMeasure } from "./engine_processors_measure";
import type { IAttributesSnapshot } from "./private_attributesSnapshot";
import type { ILayoutOptions } from "./private_layoutOptions";
import type { ILineBounds } from "./private_lineBounds";
import type { IMeasureLayout } from "./private_measureLayout";
import { detach as detachMeasureLayout } from "./private_measureLayout";
import { scoreParts } from "./private_part";

function layoutMeasures(options: ILayoutOptions) {
  const { modelFactory, header, preview, fixup, document } = options;
  const measures = options.measures;
  let attributes = options.attributes;
  let print = options.print;
  const measureShortests = measures.map((measure) =>
    getMeasureSegments(measure).reduce(
      reduceToShortestInSegments,
      Number.MAX_VALUE,
    ),
  );
  const lineShortest = measureShortests.reduce(
    (shortest, measureShortest) => Math.min(measureShortest, shortest),
    Number.MAX_VALUE,
  );

  const measureLayouts = map(measures, (measure, measureIdx) => {
    const shortest = options.singleLineMode
      ? measureShortests[measureIdx]
      : lineShortest;
    const cleanliness = document.cleanlinessTracking.measures[measure.uuid];
    let layout: IMeasureLayout;
    if (cleanliness && cleanliness.clean) {
      layout = options.preview ? cleanliness.layout : cleanliness.clean;
    } else {
      layout = layoutMeasure({
        attributes,
        document,
        factory: modelFactory,
        fixup,
        header,
        lineBarOnLine: measureIdx,
        lineCount: options.lineCount,
        lineIndex: options.lineIndex,
        lineShortest: shortest,
        lineTotalBarsOnLine: measures.length,
        measure,
        preview,
        print,
        x: 0, // Final offset set recorded in justify(...).
        singleLineMode: options.singleLineMode,
      });
    }

    // Update attributes for next measure
    attributes = layout.attributes;
    print = layout.print;
    return layout;
  });
  return {
    measureLayouts,
    attributes,
  };
}

export function layoutLine(
  options: ILayoutOptions,
  bounds: ILineBounds,
  memo: {
    y: number;
    attributes: { [part: string]: IAttributesSnapshot[] };
  },
): IMeasureLayout[] {
  const { measures } = options;

  if (!measures.length) {
    return [];
  }

  options.attributes = memo.attributes;
  const layoutInfo = layoutMeasures(options);
  const layouts = layoutInfo.measureLayouts;

  const initialAttributes = layouts[0].attributes;

  const partOrder = map(scoreParts(options.header.partList), (t) => t.id);
  let staffIdx = 0;

  const topsInOrder = map(partOrder, (partID) => {
    invariant(
      initialAttributes[partID][1].staves >= 1,
      "Expected at least 1 staff, but there are %s",
      initialAttributes[partID][1].staves,
    );

    return [null].concat(
      times(initialAttributes[partID].length - 1, () => {
        ++staffIdx;
        if (staffIdx > 1) {
          memo.y -= 100;
        }

        const paddingTop =
          maxBy(layouts, (mre) => mre.paddingTop[staffIdx] || 0).paddingTop[
            staffIdx
          ] || 0;

        const paddingBottom =
          maxBy(layouts, (mre) => mre.paddingBottom[staffIdx] || 0)
            .paddingBottom[staffIdx] || 0;

        const top = memo.y - paddingTop;
        memo.y = top - paddingBottom;
        return top;
      }),
    );
  });
  const tops: { [part: string]: number[] } = <any>(
    zipObject(partOrder, topsInOrder)
  );
  memo.y -= bounds.systemLayout.systemDistance;
  memo.attributes = layoutInfo.attributes;

  let left = bounds.left;
  forEach(layouts, (layout) => {
    layout.originY = tops;
    layout.originX = left;
    left = left + layout.width;
  });

  if (options.preview) {
    return layouts;
  }

  const detachedLayouts: IMeasureLayout[] = map(layouts, detachMeasureLayout);
  const layout = reduce(
    options.postprocessors,
    (layouts, filter) => filter(options, bounds, layouts),
    detachedLayouts,
  );
  measures.forEach((measure, i) => {
    const cleanliness =
      options.document.cleanlinessTracking.measures[measure.uuid];
    cleanliness.layout = layout[i];
    ++measure.version;
  });

  return layout;
}
