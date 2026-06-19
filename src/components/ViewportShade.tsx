// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

import { useTimeToX, usePlotPad, InCanvas } from '#/components/Plot'

export function ViewportShade({
  leftSec,
  rightSec,
}: {
  leftSec: number
  rightSec: number
}) {
  const toX = useTimeToX(InCanvas.No)
  const plotPad = usePlotPad()
  const x1 = toX(leftSec)
  const x2 = toX(rightSec)
  return (
    <div
      className="absolute overflow-hidden pointer-events-none"
      style={{
        left: plotPad.left,
        right: 0,
        top: plotPad.top,
        bottom: plotPad.bottom,
      }}
    >
      <div
        className="dark:bg-white/8 bg-black/8 absolute border-x border-x-black/25 dark:border-x-white/25 top-0 bottom-0"
        style={{
          position: 'absolute',
          left: x1 - plotPad.left,
          width: Math.max(0, x2 - x1),
        }}
      />
    </div>
  )
}
