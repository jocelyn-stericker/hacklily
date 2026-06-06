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

/**
 * Thrown when the backend a job resolves to isn't actually available — its model
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
