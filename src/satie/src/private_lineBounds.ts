// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

import type { Print, SystemLayout, Scaling } from "#/musicxml-interfaces";

import { getPageMargins } from "./private_print";

export interface ILineBounds {
  left: number;
  right: number;
  systemLayout: SystemLayout;
  top: number;
}

export function calculateLineBounds(
  print: Print,
  pageNum: number,
  scaling: Scaling,
): ILineBounds {
  const pageLayout = print.pageLayout;
  const systemLayout = print.systemLayout;
  const pageMargins = getPageMargins(pageLayout.pageMargins, pageNum);
  const systemMargins = systemLayout.systemMargins;
  const startX = systemMargins.leftMargin + pageMargins.leftMargin;
  const endX =
    systemMargins.rightMargin + pageLayout.pageWidth - pageMargins.rightMargin;
  const scale40 = (scaling.millimeters / scaling.tenths) * 40; // TODO: 40 should be 10 x (numLines - 1)
  const top =
    pageLayout.pageHeight -
    (scale40 * 10) / 2 -
    (systemLayout.topSystemDistance + pageMargins.topMargin);

  return {
    left: startX,
    right: endX,
    systemLayout: systemLayout,
    top,
  };
}
