// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

/* eslint-disable no-shadow */

import { forEach } from "lodash";

import type {
  DirectionType,
  Offset,
  Sound,
  Footnote,
  Level,
  Direction,
  Segno,
} from "#/musicxml-interfaces";
import {
  AboveBelow,
  NormalBold,
  serializeDirection,
} from "#/musicxml-interfaces";

import type { IModel, ILayout } from "./document";
import { Type } from "./document";
import type { IBoundingRect } from "./private_boundingRect";
import type { IReadOnlyValidationCursor, LayoutCursor } from "./private_cursor";
import { getTextBB } from "./private_fontManager";
import { mmToTenths, ptPerMM } from "./private_renderUtil";
import { bboxes as glyphBoxes } from "./private_smufl";

class DirectionModel implements IDirectionModel {
  _class = "Direction";

  /*---- I.1 IModel ---------------------------------------------------------------------------*/

  divCount = 0;
  divisions = 0;

  /** defined externally */
  staffIdx: number;

  /*---- I.2 Direction ------------------------------------------------------------------------*/

  directionTypes: DirectionType[];
  staff: number;
  offset: Offset;
  sound: Sound;

  /*---- I.2.1 Placement ----------------------------------------------------------------------*/

  placement: AboveBelow;

  /*---- I.2.2 EditorialVoice -----------------------------------------------------------------*/

  voice: number;
  footnote: Footnote;
  level: Level;

  /*---- I.2.3 Directive ----------------------------------------------------------------------*/

  data: string;

  /*---- Implementation -----------------------------------------------------------------------*/

  constructor(spec: Direction) {
    forEach<any>(spec, (value, key) => {
      (this as any)[key] = value;
    });
  }

  refresh(cursor: IReadOnlyValidationCursor): void {
    forEach(this.directionTypes, (type) => {
      if (type.dynamics && this.placement === AboveBelow.Unspecified) {
        cursor.patch((staff) =>
          staff.direction((direction) => direction.placement(AboveBelow.Below)),
        );
      }
    });
  }

  getLayout(cursor: LayoutCursor): IDirectionLayout {
    return new DirectionModel.Layout(this, cursor);
  }

  toXML(): string {
    return `${serializeDirection(this)}\n<forward><duration>${
      this.divCount
    }</duration></forward>\n`;
  }

  toJSON(): any {
    const {
      _class,
      directionTypes,
      staff,
      offset,
      sound,
      placement,
      voice,
      footnote,
      level,
      data,
    } = this;

    return {
      _class,
      directionTypes,
      staff,
      offset,
      sound,
      placement,
      voice,
      footnote,
      level,
      data,
    };
  }

  inspect() {
    return this.toXML();
  }

  calcWidth(_shortest: number) {
    return 0;
  }

  static Layout = class Layout implements IDirectionLayout {
    constructor(model: DirectionModel, cursor: LayoutCursor) {
      model = Object.create(model);
      if (model.directionTypes) {
        model.directionTypes = model.directionTypes.slice();
      }

      this.model = model;
      this.x = cursor.segmentX;
      this.division = cursor.segmentDivision;

      let defaultY = 0;
      switch (model.placement) {
        case AboveBelow.Below:
          defaultY = -60;
          break;
        case AboveBelow.Above:
        case AboveBelow.Unspecified:
          defaultY = 60;
          break;
        default:
          defaultY = 60;
          break;
      }

      this.boundingBoxes = [];

      forEach(model.directionTypes, (type, idx) => {
        type = model.directionTypes[idx] = Object.create(
          model.directionTypes[idx],
        );
        forEach(type.words, (_word, idx) => {
          const origModel = type.words[idx];
          const defaults = cursor.header.defaults;
          type.words[idx] = Object.create(origModel);
          type.words[idx].fontSize = type.words[idx].fontSize || "18";
          type.words[idx].defaultX = 0;
          type.words[idx].defaultY = defaultY;
          const fontBox = getTextBB(
            type.words[idx].fontFamily || "Alegreya",
            type.words[idx].data,
            parseInt(type.words[idx].fontSize, 10),
            type.words[idx].fontWeight === NormalBold.Normal ? null : "bold",
          );
          const scale40 =
            (defaults.scaling.millimeters / defaults.scaling.tenths) * 40;
          const boundingBox: IBoundingRect = <any>type.words[idx];

          // Vertical coordinates are flipped (argh!)
          // We give 10% padding because elements touching isn't ideal.
          boundingBox.top =
            -mmToTenths(scale40, fontBox.bottom / ptPerMM) * 1.1;
          boundingBox.bottom =
            -mmToTenths(scale40, fontBox.top / ptPerMM) * 1.1;

          boundingBox.left = mmToTenths(scale40, fontBox.left / ptPerMM) * 1.1;
          boundingBox.right =
            mmToTenths(scale40, fontBox.right / ptPerMM) * 1.1;
          this.boundingBoxes.push(boundingBox);
        });
        if (type.dynamics) {
          const origDynamics = type.dynamics;
          type.dynamics = Object.create(origDynamics);
          type.dynamics.defaultX = 0;
          type.dynamics.defaultY = defaultY;
          const boundingBox: IBoundingRect = <any>type.dynamics;
          boundingBox.left = -10;
          boundingBox.right = 30;
          boundingBox.top = -10;
          boundingBox.bottom = 30; // TODO
          this.boundingBoxes.push(boundingBox);
        }
        forEach(type.segnos, (origSegno, idx) => {
          const segno: Segno = Object.create(origSegno);
          type.segnos[idx] = segno;
          segno.defaultX = segno.defaultX || -30;
          segno.defaultY = segno.defaultY || defaultY;
          segno.color = segno.color || "black";
          const boundingBox: IBoundingRect = <any>segno;
          boundingBox.right = glyphBoxes["segno"][0] * 10 + 10;
          boundingBox.top = -glyphBoxes["segno"][1] * 10 - 10;
          boundingBox.left = glyphBoxes["segno"][2] * 10 - 10;
          boundingBox.bottom = -glyphBoxes["segno"][3] * 10 + 10;
          this.boundingBoxes.push(boundingBox);
        });
      });
      this.renderedWidth = 0;
    }

    /*---- ILayout ------------------------------------------------------*/

    // Constructed:

    model: DirectionModel;
    x: number;
    renderedWidth: number;
    division: number;

    // Prototype:

    boundingBoxes: IBoundingRect[] = [];
    renderClass: Type = Type.Direction;
    expandPolicy = "none" as const;
  };
}

export default function Export(constructors: { [key: number]: any }) {
  constructors[Type.Direction] = DirectionModel;
}

export interface IDirectionModel extends IModel, Direction {}

export interface IDirectionLayout extends ILayout {
  model: IDirectionModel;
}
