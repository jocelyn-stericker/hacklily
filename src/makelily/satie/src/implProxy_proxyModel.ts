/**
 * @source: https://github.com/emilyskidsister/satie/
 *
 * @license
 * (C) Jocelyn Stericker <jocelyn@nettek.ca> 2015.
 * Part of the Satie music engraver <https://github.com/emilyskidsister/satie>.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/* eslint-disable no-shadow */

import invariant from "invariant";

import type { IModel, ILayout } from "./document";
import { Type } from "./document";
import type { IReadOnlyValidationCursor, LayoutCursor } from "./private_cursor";

/**
 * Stands in for another model (Attributes/Print) inside a different staff's
 * segment. Created only by engine_processors_validate.ts
 *
 * _target is the original (never mutated); _omTarget is a prototypal clone
 * (Object.create(_target)) carrying per-staff overrides and its own
 * _snapshot, so refresh/getLayout run independently per staff.
 *
 * toXML emits <forward><duration>; toJSON returns the target spec, so a
 * proxy disappears on a clone round-trip and is rebuilt as a concrete model.
 * Factory.identity exists to unwrap a proxy but has no callers.
 */
class ProxyModel implements IProxyModel {
  private _target: IModel;
  private _omTarget: IModel;
  _class = "Proxy";

  /*---- I.1 IModel ---------------------------------------------------------------------------*/

  get divCount() {
    return this._omTarget.divCount;
  }

  set divCount(divCount: number) {
    this._omTarget.divCount = divCount;
  }

  get staffIdx() {
    return this._omTarget.staffIdx;
  }

  set staffIdx(staffIdx: number) {
    this._omTarget.staffIdx = staffIdx;
  }

  /**
   * Delegates to the proxied model's clone.
   */
  get _snapshot() {
    return (this._omTarget as any)._snapshot;
  }

  set target(target: IModel) {
    this._target = target;
    this._omTarget = Object.create(this._target);
    this._omTarget.staffIdx = undefined;
  }

  /*---- Validation Implementations -----------------------------------------------------------*/

  constructor(target: IModel) {
    this._target = target;

    // Rather than enumerate every field of every proxiable model, we wrap the
    // instance in a JS Proxy.
    return new Proxy(this, {
      getPrototypeOf() {
        return ProxyModel.prototype;
      },
      get(target, prop, receiver) {
        if (prop in target) {
          return Reflect.get(target, prop, receiver);
        }
        const om = target._omTarget;
        return om ? Reflect.get(om, prop) : undefined;
      },
      set(target, prop, value, receiver) {
        if (prop in target) {
          return Reflect.set(target, prop, value, receiver);
        }
        const om = target._omTarget;
        if (om) {
          return Reflect.set(om, prop, value);
        }
        return Reflect.set(target, prop, value, receiver);
      },
      has(target, prop) {
        const om = target._omTarget;
        return prop in target || (om ? prop in om : false);
      },
      ownKeys(target) {
        const om = target._omTarget;
        return om ? Reflect.ownKeys(om) : Reflect.ownKeys(target);
      },
      getOwnPropertyDescriptor(target, prop) {
        const om = target._omTarget;
        return om
          ? Reflect.getOwnPropertyDescriptor(om, prop)
          : Reflect.getOwnPropertyDescriptor(target, prop);
      },
    });
  }

  /**
   * Serialize as the *target* model, not as a proxy. The engine clones models
   * via `JSON.parse(JSON.stringify(model))` (see cloneObject) and later
   * rebuilds them with `factory.fromSpec`.
   */
  toJSON() {
    if (
      this._omTarget &&
      typeof (this._omTarget as any).toJSON === "function"
    ) {
      return (this._omTarget as any).toJSON();
    }
    return this._target;
  }

  toXML(): string {
    return (
      `<!-- proxy for ${(<any>this._target)
        .toXML()
        .replace(/--/g, "\\-\\-")} -->\n` +
      `<forward><duration>${this.divCount}</duration></forward>\n`
    );
  }

  inspect() {
    return this.toXML();
  }

  refresh(cursor: IReadOnlyValidationCursor): void {
    invariant(!!this._target, "A proxy must have a target.");
    this._omTarget.refresh(cursor);
  }

  getLayout(cursor: LayoutCursor): IProxyLayout {
    return this._omTarget.getLayout(cursor);
  }

  calcWidth(shortest: number) {
    return this._target ? this._target.calcWidth(shortest) : 0;
  }
}

/**
 * Registers Proxy in the factory structure passed in.
 */
export default function Export(constructors: { [key: number]: any }) {
  constructors[Type.Proxy] = ProxyModel;
}

export interface IProxyModel extends IModel {}

export interface IProxyLayout extends ILayout {
  model: IProxyModel;
}
