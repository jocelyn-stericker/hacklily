// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

import invariant from "invariant";
import { times } from "lodash";

import type { TimeModification, Time } from "#/musicxml-interfaces";

import type { IChord } from "./private_chordUtil";
import { divisions } from "./private_chordUtil";

/**
 * Information needed to create a duration using makeDuration().
 *
 * See IChord and makeDuration().
 */
export interface ITimeSpec {
  /**
   * The base of the note, as encoded by LilyPond.
   *
   * A quarter note is '4', a half note is '8', ...
   */
  count: number;

  /**
   * The number of displayed dots, or null.
   */
  dots?: number;

  /**
   * The time modification (canonical tuplet), or null.
   */
  timeModification?: TimeModification;
}

/**
 * Creates a simple realization of an IChord
 *
 * @param spec
 */
function _makeDuration(spec: ITimeSpec): IChord {
  invariant(
    !spec.timeModification,
    "timeModification is not implemented in makeDuration",
  );
  return [
    {
      dots: times(spec.dots || 0, () => {
        return {};
      }),
      noteType: {
        duration: spec.count,
      },
      _class: "Note",
    },
  ];
}

export function makeDuration(
  divPerQuarter: number,
  time: Time,
  divisionsInDuration: number,
): IChord {
  for (let count = 1; count <= 512; ++count) {
    for (let dots = 0; dots < 3; ++dots) {
      const spec = { count, dots };
      if (
        divisions(spec, { time, divisions: divPerQuarter }, true) ===
        divisionsInDuration
      ) {
        return _makeDuration(spec);
      }
    }
  }
  throw new Error(
    `Unknown duration ${divisionsInDuration} at ` +
      `${divPerQuarter} divs per quarter`,
  );
}

export const _512 = _makeDuration({ count: 512 });
export const _256 = _makeDuration({ count: 256 });
export const _256D = _makeDuration({ count: 256, dots: 1 });
export const _128 = _makeDuration({ count: 128 });
export const _128D = _makeDuration({ count: 128, dots: 1 });
export const _64 = _makeDuration({ count: 64 });
export const _64D = _makeDuration({ count: 64, dots: 1 });
export const _32 = _makeDuration({ count: 32 });
export const _32D = _makeDuration({ count: 32, dots: 1 });
export const _16 = _makeDuration({ count: 16 });
export const _16D = _makeDuration({ count: 16, dots: 1 });
export const _16DD = _makeDuration({ count: 16, dots: 2 });
export const _8 = _makeDuration({ count: 8 });
export const _8D = _makeDuration({ count: 8, dots: 1 });
export const _8DD = _makeDuration({ count: 8, dots: 2 });
export const _4 = _makeDuration({ count: 4 });
export const _4D = _makeDuration({ count: 4, dots: 1 });
export const _4DD = _makeDuration({ count: 4, dots: 2 });
export const _2 = _makeDuration({ count: 2 });
export const _2D = _makeDuration({ count: 2, dots: 1 });
export const _2DD = _makeDuration({ count: 2, dots: 2 });
export const _1 = _makeDuration({ count: 1 });
export const _1D = _makeDuration({ count: 1, dots: 1 });
export const _1DD = _makeDuration({ count: 1, dots: 2 });
export const _05 = _makeDuration({ count: 1 / 2 });
