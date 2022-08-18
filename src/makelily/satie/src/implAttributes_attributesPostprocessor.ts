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

import { forEach, sortedIndex, some } from "lodash";
import { Attributes } from "musicxml-interfaces";

import { ILayout, Type } from "./document";

import { IMeasureLayout } from "./private_measureLayout";
import { ILayoutOptions } from "./private_layoutOptions";
import { ILineBounds } from "./private_lineBounds";

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
                return details.staffLines !== newDetails.staffLines;
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
