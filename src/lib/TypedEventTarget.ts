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
