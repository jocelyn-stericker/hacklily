// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

import type { IModel, ILayout } from "./document";
import { Type } from "./document";
import type { IBoundingRect } from "./private_boundingRect";
import type { IReadOnlyValidationCursor, LayoutCursor } from "./private_cursor";

class VisualCursorModel implements IVisualCursorModel {
  _class = "VisualCursor";

  /*---- I.1 IModel ---------------------------------------------------------------------------*/

  divCount = 0;
  divisions = 0;

  staffIdx = 1;

  static _lastIdx = 1;
  _myIdx = ++VisualCursorModel._lastIdx;

  /*---- Implementation -----------------------------------------------------------------------*/

  constructor(_spec: VisualCursorModel) {
    // no-op
  }

  refresh(_cursor: IReadOnlyValidationCursor): void {
    // no-op
  }

  getLayout(cursor: LayoutCursor): IVisualCursorLayout {
    return new VisualCursorModel.Layout(this, cursor);
  }

  toXML(): string {
    return `<!-- visual cursor -->\n`;
  }

  toJSON(): any {
    const { _class } = this;

    return {
      _class,
    };
  }

  inspect() {
    return this.toXML();
  }

  calcWidth(_shortest: number) {
    return 0;
  }

  static Layout = class Layout implements IVisualCursorLayout {
    constructor(origModel: VisualCursorModel, cursor: LayoutCursor) {
      this.model = origModel;
      this.x = cursor.segmentX;
      this.division = cursor.segmentDivision;
      this.renderedWidth = 0;
    }

    /*---- ILayout ------------------------------------------------------*/

    // Constructed:

    model: VisualCursorModel;
    x: number;
    division: number;

    renderedWidth: number;

    // Prototype:

    boundingBoxes: IBoundingRect[] = [];
    renderClass: Type = Type.VisualCursor;
    expandPolicy = "none" as const;
  };
}

/**
 * Registers VisualCursor in the factory structure passed in.
 */
export default function Export(constructors: { [key: number]: any }) {
  constructors[Type.VisualCursor] = VisualCursorModel;
}

export interface IVisualCursorModel extends IModel {}

export interface IVisualCursorLayout extends ILayout {
  renderedWidth: number;
}
