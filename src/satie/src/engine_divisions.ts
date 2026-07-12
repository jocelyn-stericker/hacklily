// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

import { reduce, forEach } from "lodash";

import type { IModel, ISegment, Document } from "./document";
import { Type } from "./document";
import type { IFactory } from "./private_factory";
import { lcm } from "./private_util";

/**
 * Given a set of segments, scales divisions so that they are compatible.
 *
 * Returns the division count.
 */
export function normalizeDivisionsInPlace(
  factory: IFactory | Document,
  segments: ISegment[],
  factor: number = 0,
): number {
  const divisions: number =
    factor ||
    reduce(
      segments,
      (div1, seg) => {
        if (!div1) {
          return 1;
        }

        return lcm(div1, seg.divisions);
      },
      0,
    );

  forEach(segments, (segment) => {
    if (!segment) {
      return;
    }

    let ratio = divisions / segment.divisions;
    segment.divisions = divisions;

    forEach(segment, (model: IModel) => {
      if (model.divCount) {
        model.divCount *= ratio;
      }

      if (factory.modelHasType(model, Type.Chord)) {
        forEach(model, (note) => {
          if (note.duration) {
            note.duration *= ratio;
          }
        });
      }
      if (factory.modelHasType(model, Type.Attributes)) {
        // This could be an attributes item or a note.
        if (model.divisions) {
          ratio = divisions / model.divisions;
        }
        try {
          model.divisions = divisions;
        } catch (_err) {
          console.warn("Could not set divisions");
        }
      }
    });
  });

  return divisions;
}
