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

import { useSyncExternalStore } from 'react'

import type {
  DownloadModel,
  DownloadState,
  WorkerDownloadModel,
} from '#/lib/modelDownload'
import {
  downloadedVersion,
  getState,
  IDLE,
  isModelDownloaded,
  subscribeDownloaded,
  subscribeState,
} from '#/lib/modelDownload'

export function useModelDownloaded(model: WorkerDownloadModel): boolean {
  return useSyncExternalStore(
    subscribeDownloaded,
    () => isModelDownloaded(model),
    () => false,
  )
}

/**
 * A counter that increments every time a model finishes downloading. Consumers
 * that can't otherwise observe a completion (notably the browser on-device
 * availability probe) can depend on it to re-run.
 */
export function useDownloadVersion(): number {
  return useSyncExternalStore(
    subscribeDownloaded,
    () => downloadedVersion,
    () => 0,
  )
}

export function useDownloadState(model: DownloadModel): DownloadState {
  return useSyncExternalStore(
    subscribeState,
    () => getState(model),
    () => IDLE,
  )
}
