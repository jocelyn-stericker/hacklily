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

import { FolderOpen, MicVocal, Pause, Play, SkipBack } from 'lucide-react'

import braatPng from '#/braat.png'
import { Button } from '#/components/ui/button'

import type { TimelineState, Status } from './useTimelineState'

export function Toolbar({
  openFilePicker,
  timelineState,
  status,
  onBackToStart,
  onStart,
  onPause,
  onPlay,
  playDisabled,
}: {
  openFilePicker: () => void
  timelineState: TimelineState
  status: Status
  onBackToStart: () => void
  onStart: () => void
  onPause: () => void
  onPlay: () => void
  playDisabled: boolean
}) {
  return (
    <header className="flex align-center justify-end gap-1 p-2 flex-wrap">
      <h1 className="text-lg font-bold bg-[#8ace00] mr-2">
        <img src={braatPng} className="h-10" />
      </h1>
      <div className="grow" />
      <Button
        variant="default"
        className="h-10 w-10 cursor-pointer"
        title="Open an audio file"
        onClick={openFilePicker}
      >
        <FolderOpen className="size-6" />
      </Button>
      <Button
        variant="default"
        className="h-10 w-10 cursor-pointer"
        title="Back to start"
        disabled={
          timelineState.cursorSec === 0 && timelineState.viewportLeftSec === 0
        }
        onClick={onBackToStart}
      >
        <SkipBack className="size-6" />
      </Button>
      <Button
        variant="default"
        className="h-10 w-10 cursor-pointer"
        disabled={status.value === 'recording' || status.value === 'analyzing'}
        title="Analyze audio from microphone"
        onClick={onStart}
      >
        <MicVocal className="size-6" />
      </Button>
      {status.value === 'playing' || status.value === 'recording' ? (
        <Button
          variant="default"
          className="h-10 w-10 cursor-pointer"
          title="Pause audio track"
          onClick={onPause}
        >
          <Pause className="size-6" />
        </Button>
      ) : (
        <Button
          variant="default"
          className="h-10 w-10 cursor-pointer"
          title="Play back audio track"
          onClick={onPlay}
          disabled={playDisabled}
        >
          <Play className="size-6" />
        </Button>
      )}
    </header>
  )
}
