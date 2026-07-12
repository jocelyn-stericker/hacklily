// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

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
