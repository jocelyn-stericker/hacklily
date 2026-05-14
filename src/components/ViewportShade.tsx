/* Braat
 * Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

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
        style={{
          position: 'absolute',
          left: x1 - plotPad.left,
          width: Math.max(0, x2 - x1),
          top: 0,
          bottom: 0,
          background: 'rgba(255,255,255,0.08)',
          borderLeft: '1px solid rgba(255,255,255,0.25)',
          borderRight: '1px solid rgba(255,255,255,0.25)',
        }}
      />
    </div>
  )
}
