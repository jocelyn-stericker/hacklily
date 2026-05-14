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

export function featureCheck() {
  if (!self.crossOriginIsolated) {
    return 'This page was loaded without cross origin isolation, which Braat requires for live analysis. Either the server is not sending the correct headers, or your browser does not support this feature. Live analysis will not work.'
  } else if (typeof SharedArrayBuffer === 'undefined') {
    return 'Cross origin isolation is enabled, but SharedArrayBuffer is not available in this browser. Live analysis will not work.'
  }
  return null
}
