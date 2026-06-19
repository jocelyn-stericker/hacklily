// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

export type PracticeHandoffData = {
  pcm: Float32Array
  sampleRate: number
  passageId?: string
}

declare global {
  interface Window {
    __braatPracticeHandoff?: PracticeHandoffData
  }
}

export function stashTake(data: PracticeHandoffData): void {
  window.__braatPracticeHandoff = data
}

export function takePracticeData(): PracticeHandoffData | null {
  const opener = window.opener as Window | null
  if (!opener?.__braatPracticeHandoff) return null
  const data = opener.__braatPracticeHandoff
  delete opener.__braatPracticeHandoff
  return data
}
