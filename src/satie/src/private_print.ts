// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

/* eslint-disable @typescript-eslint/prefer-for-of */

import type { PageMargins } from "#/musicxml-interfaces";
import { OddEvenBoth } from "#/musicxml-interfaces";

export function getPageMargins(
  pageMargins: PageMargins[],
  page: number,
): PageMargins {
  for (let i = 0; i < pageMargins.length; ++i) {
    if (
      pageMargins[i].type === OddEvenBoth.Both ||
      (pageMargins[i].type === OddEvenBoth.Even && page % 2 === 0) ||
      (pageMargins[i].type === OddEvenBoth.Odd && page % 2 === 1)
    ) {
      return pageMargins[i];
    }
  }
  throw new Error("Invalid page margins");
}
