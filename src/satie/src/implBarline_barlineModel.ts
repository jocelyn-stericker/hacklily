// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

import { some, forEach } from "lodash";

import type {
  Barline,
  Segno,
  Coda,
  BarlineLocation,
  WavyLine,
  Fermata,
  BarStyle,
  Ending,
  Repeat,
  Footnote,
  Level,
  PartGroup,
  PartSymbol,
  Attributes,
} from "#/musicxml-interfaces";
import { BarStyleType, serializeBarline } from "#/musicxml-interfaces";
import { buildBarStyle } from "#/musicxml-interfaces/builders";

import type { IModel, ILayout } from "./document";
import { Type } from "./document";
import {
  needsWarning,
  clefsEqual,
  CLEF_INDENTATION,
} from "./implAttributes_attributesData";
import type { IAttributesLayout } from "./implAttributes_attributesModel";
import { createWarningLayout } from "./implAttributes_attributesModel";
import type { IBoundingRect } from "./private_boundingRect";
import type { IReadOnlyValidationCursor, LayoutCursor } from "./private_cursor";
import { groupsForPart } from "./private_part";
import { bravura } from "./private_smufl";

class BarlineModel implements IBarlineModel {
  _class = "Barline";

  /*---- I.1 IModel ---------------------------------------------------------------------------*/

  divCount = 0;

  /** defined externally */
  staffIdx: number;

  /*---- I.2 Barline --------------------------------------------------------------------------*/

  segno: Segno;
  coda: Coda;
  location: BarlineLocation;
  codaAttrib: string;
  wavyLine: WavyLine;
  fermatas: Fermata[];
  segnoAttrib: string;
  divisions: number;
  barStyle: BarStyle;
  ending: Ending;
  repeat: Repeat;

  /*---- I.3 Editorial ------------------------------------------------------------------------*/

  footnote: Footnote;
  level: Level;

  /*---- II. BarlineModel (extension) ---------------------------------------------------------*/

  defaultX: number;
  defaultY: number;
  satieAttributes: IAttributesLayout;
  satieAttribsOffset: number;

  /*---- Implementation -----------------------------------------------------------------------*/

  constructor(spec: Barline) {
    forEach(spec, (value, key) => {
      (this as any)[key] = value;
    });
  }

  toJSON() {
    const {
      _class,
      segno,
      coda,
      location,
      codaAttrib,
      wavyLine,
      fermatas,
      segnoAttrib,
      divisions,
      barStyle,
      ending,
      repeat,
      footnote,
    } = this;
    return {
      _class,
      segno,
      coda,
      location,
      codaAttrib,
      wavyLine,
      fermatas,
      segnoAttrib,
      divisions,
      barStyle,
      ending,
      repeat,
      footnote,
    };
  }

  refresh(cursor: IReadOnlyValidationCursor): void {
    if (!this.barStyle) {
      cursor.patch((staff) =>
        staff.barline((barline) =>
          barline.barStyle(
            buildBarStyle((barStyle) =>
              barStyle.data(BarStyleType.Regular).color("black"),
            ),
          ),
        ),
      );
    }
    if (!isFinite(this.barStyle.data) || this.barStyle.data === null) {
      const lastBarlineInSegment = !some(
        cursor.segmentInstance.slice(cursor.segmentPosition + 1),
        (model) => cursor.factory.modelHasType(model, Type.Barline),
      );
      cursor.patch((staff) =>
        staff.barline((barline) =>
          barline.barStyle({
            data:
              lastBarlineInSegment && cursor.measureIsLast
                ? BarStyleType.LightHeavy
                : BarStyleType.Regular,
          }),
        ),
      );
    }
    if (!this.barStyle.color) {
      cursor.patch((staff) =>
        staff.barline((barline) =>
          barline.barStyle((barStyle) => barStyle.color("black")),
        ),
      );
    }
  }

  getLayout(cursor: LayoutCursor): IBarlineLayout {
    // mutates cursor as required.
    return new BarlineModel.Layout(this, cursor);
  }

  toXML(): string {
    return `${serializeBarline(this)}\n<forward><duration>${
      this.divCount
    }</duration></forward>\n`;
  }

  inspect() {
    return this.toXML();
  }

  calcWidth(_shortest: number) {
    return 8; // TODO
  }

  static Layout = class Layout implements IBarlineLayout {
    constructor(origModel: BarlineModel, cursor: LayoutCursor) {
      this.division = cursor.segmentDivision;
      this.x = cursor.segmentX;
      const attributes = cursor.staffAttributes;
      const { measureStyle, partSymbol } = attributes;
      if (measureStyle.multipleRest && measureStyle.multipleRest.count > 1) {
        // TODO: removing this shows that measures are slightly misplaced
        return;
      }

      this.partGroups = groupsForPart(
        cursor.header.partList,
        cursor.segmentInstance.part,
      );
      this.partSymbol = partSymbol;

      this.model = Object.create(origModel, {
        defaultX: {
          get: () => this.overrideX,
        },
      });

      let clefOffset = 0;

      if (cursor.lineTotalBarsOnLine === cursor.lineBarOnLine + 1) {
        // TODO: Figure out a way to get this to work when the attributes on the next
        // line change
        const nextMeasure =
          cursor.document.measures[cursor.measureInstance.idx + 1];
        const part =
          nextMeasure && nextMeasure.parts[cursor.segmentInstance.part];
        const segment = part && part.staves[cursor.staffIdx];
        let nextAttributes: Attributes;
        if (segment) {
          const n = cursor.factory.search(segment, 0, Type.Attributes)[0];
          if (n) {
            nextAttributes = n._snapshot;
          }
        }
        const addWarning =
          nextAttributes &&
          needsWarning(attributes, nextAttributes, cursor.staffIdx);

        if (addWarning) {
          const clefsAreEqual = clefsEqual(
            attributes,
            nextAttributes,
            cursor.staffIdx,
          );
          clefOffset = clefsAreEqual ? 0 : CLEF_INDENTATION;
          this.model.satieAttributes = createWarningLayout(
            cursor,
            attributes,
            nextAttributes,
          );
        }
      }

      this.model.defaultY = 0;

      this.yOffset = 0; // TODO
      this.height = 20; // TODO

      /*---- Geometry ---------------------------------------*/

      const lineWidths = cursor.header.defaults.appearance.lineWidths;

      const barlineSep = bravura.engravingDefaults.barlineSeparation;

      const setLines = (lines: string[]) => {
        let x = 0;
        this.lineStarts = [];
        this.lineWidths = [];
        forEach(lines, (line, idx) => {
          if (idx > 0) {
            x += barlineSep * 10;
          }
          this.lineStarts.push(x);
          const width = lineWidths[line].tenths;
          this.lineWidths.push(width);
          x += width;
        });
        this.model.satieAttribsOffset = x + 8 + clefOffset;
        cursor.segmentX += x;
      };

      switch (this.model.barStyle.data) {
        case BarStyleType.LightHeavy:
          setLines(["light barline", "heavy barline"]);
          break;
        case BarStyleType.LightLight:
          setLines(["light barline", "light barline"]);
          break;
        case BarStyleType.HeavyHeavy:
          setLines(["heavy barline", "heavy barline"]);
          break;
        case BarStyleType.HeavyLight:
          setLines(["heavy barline", "light barline"]);
          break;
        case BarStyleType.Regular:
        case BarStyleType.Dashed:
        case BarStyleType.Dotted:
        case BarStyleType.Short:
        case BarStyleType.Tick:
          setLines(["light barline"]);
          break;
        case BarStyleType.Heavy:
          setLines(["heavy barline"]);
          break;
        case BarStyleType.None:
          setLines([]);
          break;
        default:
          throw new Error("Not implemented");
      }

      this.renderedWidth = cursor.segmentX - this.x + 8;
    }

    /*---- ILayout ------------------------------------------------------*/

    // Constructed:

    model: BarlineModel;
    x: number;
    division: number;
    height: number;
    yOffset: number;
    renderedWidth: number;

    /**
     * Set by layout engine.
     */
    overrideX: number;

    // Prototype:

    boundingBoxes: IBoundingRect[] = [];
    renderClass: Type = Type.Barline;
    expandPolicy = "none" as const;

    /*---- Extensions ---------------------------------------------------*/

    lineStarts: number[];
    lineWidths: number[];

    partGroups: PartGroup[];
    partSymbol: PartSymbol;
  };
}

/**
 * Registers Barline in the factory structure passed in.
 */
export default function Export(constructors: { [key: number]: any }) {
  constructors[Type.Barline] = BarlineModel;
}

export interface IBarlineModel extends IModel, Barline {
  divisions: number;
  defaultX: number;
  defaultY: number;
  satieAttributes: IAttributesLayout;
  satieAttribsOffset: number;
}

export interface IBarlineLayout extends ILayout {
  model: IBarlineModel;
  height: number;
  yOffset: number;

  lineStarts: number[];
  lineWidths: number[];

  partSymbol: PartSymbol;
  partGroups: PartGroup[];
}
