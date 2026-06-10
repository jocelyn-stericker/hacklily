// SPDX-License-Identifier: AGPL-3.0-or-later

// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

/**
 * Thrown when the backend a job resolves to isn't actually available -- its model
 * was never downloaded, or its cached weights were evicted. Distinct from an
 * ordinary inference error: a `run` that throws this makes the queue stand down
 * (call `onUnavailable`) rather than mark the chunk failed.
 */
export class ModelUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ModelUnavailableError'
  }
}
