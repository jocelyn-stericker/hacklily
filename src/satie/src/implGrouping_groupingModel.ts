/**
 * This file is part of Satie music engraver <https://github.com/emilyskidsister/satie>.
 * Copyright (C) Jocelyn Stericker <jocelyn@nettek.ca> 2015 - present.
 *
 * Satie is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * Satie is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with Satie.  If not, see <http://www.gnu.org/licenses/>.
 */

import { forEach } from "lodash";

import type { Feature, StartStopSingle, Grouping } from "#/musicxml-interfaces";
import { serializeGrouping } from "#/musicxml-interfaces";

import type { IModel, ILayout } from "./document";
import { Type } from "./document";
import type { IBoundingRect } from "./private_boundingRect";
import type { IReadOnlyValidationCursor, LayoutCursor } from "./private_cursor";

class GroupingModel implements IGroupingModel {
  /*---- I.1 IModel ---------------------------------------------------------------------------*/

  divCount = 0;
  divisions = 0;

  /** defined externally */
  staffIdx: number;

  /*---- I.2 Grouping -------------------------------------------------------------------------*/

  features: Feature[];
  number: number;
  type: StartStopSingle;
  memberOf: string;

  /*---- Implementation -----------------------------------------------------------------------*/

  constructor(spec: Grouping) {
    forEach<any>(spec, (value, key) => {
      (this as any)[key] = value;
    });
  }

  refresh(_cursor: IReadOnlyValidationCursor): void {
    // todo
  }

  getLayout(cursor: LayoutCursor): IGroupingLayout {
    // todo

    return new GroupingModel.Layout(this, cursor);
  }

  toXML(): string {
    return `${serializeGrouping(this)}\n<forward><duration>${
      this.divCount
    }</duration></forward>\n`;
  }

  inspect() {
    return this.toXML();
  }

  calcWidth(_shortest: number) {
    return 0;
  }

  static Layout = class Layout implements IGroupingLayout {
    constructor(model: GroupingModel, cursor: LayoutCursor) {
      this.model = model;
      this.x = cursor.segmentX;
      this.division = cursor.segmentDivision;
    }

    /*---- ILayout ------------------------------------------------------*/

    // Constructed:

    model: GroupingModel;
    x: number;
    division: number;

    // Prototype:

    boundingBoxes: IBoundingRect[] = [];
    renderClass: Type = Type.Grouping;
    expandPolicy = "none" as const;
  };
}

/**
 * Registers Grouping in the factory structure passed in.
 */
export default function Export(constructors: { [key: number]: any }) {
  constructors[Type.Grouping] = GroupingModel;
}

export interface IGroupingModel extends IModel, Grouping {}

export interface IGroupingLayout extends ILayout {}
