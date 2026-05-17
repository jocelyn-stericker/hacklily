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

declare module '#/lib/SpectrogramWorker?worker' {
  import type { SpectrogramWorker } from '#/lib/SpectrogramWorker'

  const SpectrogramWorkerConstructor: new () => SpectrogramWorker
  export default SpectrogramWorkerConstructor
}

declare module '#/lib/FormantWorker?worker' {
  import type { FormantWorker } from '#/lib/FormantWorker'

  const FormantWorkerConstructor: new () => FormantWorker
  export default FormantWorkerConstructor
}

declare module '#/lib/importWorker?worker' {
  import type { ImportWorker } from '#/lib/importWorker'

  const ImportWorkerConstructor: new () => ImportWorker
  export default ImportWorkerConstructor
}
