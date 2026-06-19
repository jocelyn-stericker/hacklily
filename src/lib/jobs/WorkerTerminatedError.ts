// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Jocelyn Stericker <jocelyn@nettek.ca>

/**
 * Thrown when a worker is terminated while a job is in flight. Distinct from
 * `ModelUnavailableError`: the model is fine; the job was simply aborted by the
 * owner (e.g. heavy work disabled during recording). The chunk is left clean --
 * no transcript, no error -- so the queue retries it when work resumes.
 */
export class WorkerTerminatedError extends Error {
  constructor() {
    super('Worker was terminated.')
    this.name = 'WorkerTerminatedError'
  }
}
