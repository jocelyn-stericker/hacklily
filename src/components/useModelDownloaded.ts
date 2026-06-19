// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

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
