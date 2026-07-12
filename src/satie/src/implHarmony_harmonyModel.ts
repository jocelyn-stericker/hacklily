// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

import { forEach } from "lodash";

import type {
  Frame,
  ExplicitImpliedAlternate,
  Root,
  Function,
  Kind,
  Degree,
  Inversion,
  Bass,
  Footnote,
  Level,
  NormalBold,
  NormalItalic,
  AboveBelow,
  Harmony,
  Offset,
} from "#/musicxml-interfaces";
import { serializeHarmony } from "#/musicxml-interfaces";

import type { IModel, ILayout } from "./document";
import { Type } from "./document";
import type { IBoundingRect } from "./private_boundingRect";
import type { IReadOnlyValidationCursor, LayoutCursor } from "./private_cursor";

class HarmonyModel implements IHarmonyModel {
  /*---- I.1 IModel ---------------------------------------------------------------------------*/

  divCount = 0;
  divisions = 0;

  /** defined externally */
  staffIdx: number;

  /*---- I.2 Harmony --------------------------------------------------------------------------*/

  frame: Frame;
  printFrame: boolean;
  staff: number;
  type: ExplicitImpliedAlternate;
  offset: Offset;

  /*---- I.2.1 HarmonyChord -------------------------------------------------------------------*/

  root: Root;
  function: Function;
  kind: Kind;
  degrees: Degree[];
  inversion: Inversion;
  bass: Bass;

  /*---- I.2.2 Editorial ----------------------------------------------------------------------*/

  footnote: Footnote;
  level: Level;

  /*---- I.2.3 PrintObject --------------------------------------------------------------------*/

  printObject: boolean;

  /*---- I.2.4 PrintStyle ---------------------------------------------------------------------*/

  /*---- PrintStyle > Position ------------------------------------------------------------*/

  defaultX: number; // ignored for now
  relativeY: number;
  defaultY: number;
  relativeX: number;

  /*---- PrintStyle > Font ----------------------------------------------------------------*/

  fontFamily: string;
  fontWeight: NormalBold;
  fontStyle: NormalItalic;
  fontSize: string;

  /*---- PrintStyle > Color ---------------------------------------------------------------*/

  get color(): string {
    const hex = this._color.toString(16);
    return "#" + "000000".substr(0, 6 - hex.length) + hex;
  }
  set color(a: string) {
    switch (true) {
      case !a:
        this._color = 0;
        break;
      case a[0] === "#":
        a = a.slice(1);
        this._color = parseInt(a, 16);
        break;
      default:
        this._color = parseInt(a, 16);
        break;
    }
  }

  /*---- I.2.5 Placement ----------------------------------------------------------------------*/

  placement: AboveBelow;

  /*---- Private ------------------------------------------------------------------------------*/

  private _color = 0x000000;

  /*---- Implementation -----------------------------------------------------------------------*/

  constructor(spec: Harmony) {
    forEach<any>(spec, (value, key) => {
      (this as any)[key] = value;
    });
  }

  refresh(_cursor: IReadOnlyValidationCursor): void {
    // todo
  }

  getLayout(cursor: LayoutCursor): IHarmonyLayout {
    // todo

    return new HarmonyModel.Layout(this, cursor);
  }

  toXML(): string {
    return `${serializeHarmony(this)}\n<forward><duration>${
      this.divCount
    }</duration></forward>\n`;
  }

  inspect() {
    return this.toXML();
  }

  calcWidth(_shortest: number) {
    return 0;
  }

  static Layout = class Layout implements IHarmonyLayout {
    constructor(model: HarmonyModel, cursor: LayoutCursor) {
      this.model = model;
      this.x = cursor.segmentX;
      this.division = cursor.segmentDivision;
    }

    /*---- ILayout ------------------------------------------------------*/

    // Constructed:

    model: HarmonyModel;
    x: number;
    division: number;

    // Prototype:

    boundingBoxes: IBoundingRect[] = [];
    renderClass: Type = Type.Harmony;
    expandPolicy = "none" as const;
  };
}

/**
 * Registers Harmony in the factory structure passed in.
 */
export default function Export(constructors: { [key: number]: any }) {
  constructors[Type.Harmony] = HarmonyModel;
}

export interface IHarmonyModel extends IModel, Harmony {}

export interface IHarmonyLayout extends ILayout {}
