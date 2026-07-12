// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

/* eslint-disable no-shadow */

import { forEach, sortedIndex, some } from "lodash";

import type { Attributes } from "#/musicxml-interfaces";

import type { ILayout } from "./document";
import { Type } from "./document";
import type { ILayoutOptions } from "./private_layoutOptions";
import type { ILineBounds } from "./private_lineBounds";
import type { IMeasureLayout } from "./private_measureLayout";

/**
 * Sets the width of attributes w.r.t. staff lines.
 *
 * @returns a list of measures
 */
function attributes(
  _options: ILayoutOptions,
  _bounds: ILineBounds,
  measures: IMeasureLayout[],
): IMeasureLayout[] {
  const attributesByPart: { [part: string]: ILayout } = {};
  const originXByPart: { [part: string]: number } = {};
  let measureStartX = 0;
  const targetsByPart: { [part: string]: number[] } = {};
  const isBarlineByPart: { [part: string]: boolean[] } = {};

  forEach(measures, (measure) => {
    forEach(measure.elements, (elements) => {
      forEach(elements, (element) => {
        if (!element.model) {
          return;
        }
        if (
          element.renderClass === Type.Barline ||
          element.renderClass === Type.Chord
        ) {
          const partKey = element.part + "_" + element.model.staffIdx;
          if (!element.model.staffIdx) {
            console.warn("Missing staffIdx", element.model);
          }
          if (!targetsByPart[partKey]) {
            targetsByPart[partKey] = [];
            isBarlineByPart[partKey] = [];
          }
          const targets = targetsByPart[partKey];
          const x = element.x + measureStartX;
          const index = sortedIndex(targets, x);
          const isBarline = element.renderClass === Type.Barline;
          if (targets[index] === x) {
            isBarlineByPart[partKey][index] =
              isBarlineByPart[partKey][index] || isBarline;
          } else {
            targets.splice(index, 0, element.x + measureStartX);
            isBarlineByPart[partKey].splice(index, 0, isBarline);
          }
        }
      });
    });
    measureStartX += measure.width;
  });

  measureStartX = 0;

  forEach(measures, (measure) => {
    forEach(measure.elements, (elements) => {
      forEach(elements, (element) => {
        if (!element.model) {
          return;
        }
        const partKey = element.part + "_" + element.model.staffIdx;
        if (element.renderClass === Type.Attributes && element.model) {
          // Calculate the width for the staff lines in the previous attributes element.
          {
            const targets = targetsByPart[partKey] || [];
            let targetIdx = sortedIndex(targets, element.x + measureStartX) - 1;
            const targetIsBarline = isBarlineByPart[partKey][targetIdx];
            if (!targetIsBarline) {
              targetIdx++;
            }
            if (attributesByPart[partKey]) {
              const target = targets[targetIdx];
              (<any>attributesByPart[partKey]).staffWidth =
                target - originXByPart[partKey];
            }
          }

          // Capture the new attributes element.
          let shouldSplit = false;

          if (!attributesByPart[partKey]) {
            shouldSplit = true;
          } else {
            const oldAttributes: Attributes = attributesByPart[partKey]
              .model as any;
            const newAttributes: Attributes = element.model as any;
            shouldSplit = some(
              oldAttributes.staffDetails,
              (details, detailIndex) => {
                if (!details) {
                  return false;
                }
                const newDetails = newAttributes.staffDetails[detailIndex];
                // A staff may have details in the old attributes but none in the
                // new (e.g. when a proxy mirrors a subset of staves). Guard the
                // lookup rather than crashing on undefined/null.
                return (
                  details.staffLines !== (newDetails && newDetails.staffLines)
                );
              },
            );
          }

          if (shouldSplit) {
            attributesByPart[partKey] = element;
            const targets = targetsByPart[partKey] || [];
            const targetIdx =
              sortedIndex(targets, element.x + measureStartX) - 1;
            const attrTarget = targets[targetIdx] || 0;
            const target = targets[targetIdx] || 0;
            originXByPart[partKey] = target;
            (<any>element).staffLinesOffsetX =
              element.x + measureStartX - target - (target - attrTarget);
          }
        }
      });
    });
    measureStartX += measure.width;
  });
  forEach(attributesByPart, (attributes, partKey) => {
    (<any>attributes).staffWidth = measureStartX - originXByPart[partKey];
  });
  return measures;
}

export default attributes;
