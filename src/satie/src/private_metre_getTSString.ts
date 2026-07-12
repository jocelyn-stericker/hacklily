// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

import invariant from "invariant";
import { reduce } from "lodash";

import type { Time } from "#/musicxml-interfaces";

/**
 * @returns a TS string for lookup in the BEAMING_PATTERNS array.
 */
export default function getTSString(time: Time) {
  invariant(!!time, "Expected time to be defined.");
  return reduce(
    time.beats,
    (memo, beats, idx) => {
      return beats + "/" + time.beatTypes[idx];
    },
    "",
  );
}
