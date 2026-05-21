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

type AnyEventMap = Record<string, Event>

export class TypedEventTarget<M extends AnyEventMap> {
  #target = new EventTarget()

  addEventListener<K extends keyof M & string>(
    type: K,
    listener: (ev: M[K]) => void,
    options?: boolean | AddEventListenerOptions,
  ): void {
    this.#target.addEventListener(type, listener as EventListener, options)
  }

  removeEventListener<K extends keyof M & string>(
    type: K,
    listener: (ev: M[K]) => void,
    options?: boolean | EventListenerOptions,
  ): void {
    this.#target.removeEventListener(type, listener as EventListener, options)
  }

  protected emit<K extends keyof M & string>(
    type: K,
    ...init: M[K] extends CustomEvent<infer D> ? [detail: D] : []
  ): void {
    const event =
      init.length > 0
        ? new CustomEvent(type, { detail: init[0] })
        : new Event(type)
    this.#target.dispatchEvent(event)
  }
}
