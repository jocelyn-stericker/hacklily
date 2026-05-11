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

// AudioWorkletGlobalScope (WorkletGlobalScope) does not include the Encoding API,
// so TextDecoder is undefined.  wasm-bindgen's generated glue calls `new TextDecoder()`
// at module load time (for panic message formatting), so we must polyfill it before
// that module evaluates.  This module must therefore be imported before braat_dsp.js.
if (typeof TextDecoder === 'undefined') {
  ;(globalThis as Record<string, unknown>)['TextDecoder'] = class {
    decode(view?: ArrayBuffer | ArrayBufferView): string {
      if (!view) return ''
      const v = view as ArrayBufferView
      const arr =
        view instanceof ArrayBuffer
          ? new Uint8Array(view)
          : new Uint8Array(v.buffer, v.byteOffset, v.byteLength)
      let s = ''
      for (const byte of arr) s += String.fromCharCode(byte)
      return s
    }
  }
}
