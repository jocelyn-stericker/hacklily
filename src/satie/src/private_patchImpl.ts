// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

import type { IAny } from "#/musicxml-interfaces/operations";

export default class PatchImpl {
  isPatches = true;

  content: IAny[];
  isPreview: boolean; // MUTABLE

  constructor(content: IAny[], isPreview: boolean) {
    this.content = content.slice();
    this.isPreview = isPreview;
    Object.freeze(this.content);
    this.content.forEach((item) => {
      Object.freeze(item);
      Object.freeze(item.p);
      // Note: We don't deep freeze ld, li, od, or oi. Should we?
      Object.freeze(item.ld);
      Object.freeze(item.li);
      Object.freeze(item.od);
      Object.freeze(item.oi);
      Object.seal(item);
    });
    Object.seal(this);
  }
}
