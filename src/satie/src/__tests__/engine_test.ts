// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

/**
 * @file part of Satie test suite
 */

import { map } from "lodash";

import type { Print } from "#/musicxml-interfaces";
import { OddEvenBoth, PartSymbolType } from "#/musicxml-interfaces";

import type { IModel, ILayout } from "../document";
import { Type } from "../document";
import validate from "../engine_processors_validate";
import type { IAttributesSnapshot } from "../private_attributesSnapshot";
import type { ValidationCursor, LayoutCursor } from "../private_cursor";
import type { IFactory } from "../private_factory";
import type { ILayoutOptions } from "../private_layoutOptions";
import { calculateLineBounds } from "../private_lineBounds";
import { createFakeStaffSegment, createFakeVoiceSegment } from "./etestutil";

describe("[engine.ts]", function () {
  describe("Options.ILineBounds.calculate", function () {
    it("works", function () {
      const spec1: Print = {
        measureNumbering: {
          data: "system",
        },
        partNameDisplay: null,
        newSystem: null,
        newPage: null,
        blankPage: null,
        measureLayout: null,
        partAbbreviationDisplay: null,
        staffSpacing: null,
        staffLayouts: null,
        pageNumber: "1",
        systemLayout: {
          systemMargins: {
            leftMargin: 0,
            rightMargin: 0,
          },
          topSystemDistance: 0,
        },
        pageLayout: {
          pageHeight: 1000,
          pageWidth: 1000,
          pageMargins: [
            {
              bottomMargin: 10,
              leftMargin: 11,
              rightMargin: 12,
              topMargin: 13,
              type: OddEvenBoth.Odd,
            },
            {
              bottomMargin: 10,
              leftMargin: 21,
              rightMargin: 22,
              topMargin: 13,
              type: OddEvenBoth.Even,
            },
          ],
        },
      };
      expect(
        calculateLineBounds(spec1, 1, { millimeters: 10, tenths: 40 }),
      ).toEqual({
        left: 11,
        right: 1000 - 12,
        systemLayout: {
          systemMargins: {
            leftMargin: 0,
            rightMargin: 0,
          },
          topSystemDistance: 0,
        },
        top: 937,
      });
      expect(
        calculateLineBounds(spec1, 2, { millimeters: 10, tenths: 40 }),
      ).toEqual({
        left: 21,
        right: 1000 - 22,
        systemLayout: {
          systemMargins: {
            leftMargin: 0,
            rightMargin: 0,
          },
          topSystemDistance: 0,
        },
        top: 937,
      });
    });
  });
  describe("validate", function () {
    it("creates attributes and barline if missing", function () {
      let calledCount = 0;

      const createAttributesChordFactory: IFactory = {
        create: (
          _modelType: Type,
        ): IModel & { _snapshot: IAttributesSnapshot } => {
          ++calledCount;
          return {
            divCount: 0,
            staffIdx: 1,
            _snapshot: {
              keySignature: { fifths: 0, mode: "major" },
              clef: { sign: "G", line: 2, clefOctaveChange: null },
              time: { beats: ["4"], beatTypes: [4], senzaMisura: null },
              divisions: 4,
              measure: 0,
              clefs: [],
              times: [],
              keySignatures: [],
              transposes: [],
              staffDetails: [],
              directives: [],
              measureStyle: {},
              partSymbol: { type: PartSymbolType.None },
              transpose: { chromatic: "" },
              staves: 5,
              instruments: "",
            },

            refresh: (_cursor: ValidationCursor) => {
              /* pass */
            },
            getLayout: function (_cursor: LayoutCursor): ILayout {
              throw "not reached";
            },
            calcWidth: () => 0,
          };
        },
        modelHasType(model: IModel, ...modelTypes: Type[]): boolean {
          const modelType = modelTypes[0];
          if (model.divCount === 0) {
            return modelType === Type.Attributes;
          } else if ("length" in model) {
            return modelType === Type.Chord;
          }
          return modelType === Type.Spacer;
        },
        search: (models: IModel[], idx: number, modelType: Type): IModel[] => {
          const model = models[idx];
          if (model.divCount === 0) {
            if (modelType === Type.Attributes) {
              return [model];
            } else {
              return [];
            }
          }
          if (modelType === Type.Chord) {
            return [model];
          } else {
            return [];
          }
        },
        fromSpec: (model: any): IModel => {
          return createAttributesChordFactory.create(Type[model._class] as any);
        },
      } as any;

      const padding = 20;

      const segments = [
        {
          staves: [null, createFakeStaffSegment(4, 4, 1)],
          voices: [
            null,
            createFakeVoiceSegment(2, 6, 1),
            createFakeVoiceSegment(1, 7, 2),
          ],
        },
      ];

      const contextOptions: ILayoutOptions = {
        document: {
          // eslint-disable-next-line @typescript-eslint/unbound-method
          modelHasType: createAttributesChordFactory.modelHasType,
          __fakeDocument: true,
          cleanlinessTracking: {
            measures: {},
            lines: [],
            linePlacementHints: [],
          },
        } as any,
        preview: false,
        fixup: null,
        lineCount: 0,
        lineIndex: 0,
        singleLineMode: false,

        attributes: null,
        measures: map(segments, function (segment, idx) {
          return {
            idx: idx,
            uuid: 91015 + idx,
            number: String(idx + 1),
            version: 0,
            parts: {
              P1: {
                voices: segment.voices,
                staves: segment.staves,
              },
            },
          };
        }),
        header: null,
        print: {
          measureNumbering: null,
          blankPage: null,
          partNameDisplay: null,
          newSystem: null,
          newPage: null,
          measureLayout: null,
          partAbbreviationDisplay: null,
          pageNumber: null,
          staffLayouts: null,
          staffSpacing: null,
          systemLayout: null,
          pageLayout: {
            pageHeight: 1000,
            pageWidth: 1000,
            pageMargins: [
              {
                leftMargin: padding,
                rightMargin: padding,
                bottomMargin: padding,
                topMargin: padding,
                type: OddEvenBoth.Both,
              },
            ],
          },
        },
        modelFactory: createAttributesChordFactory,
        preprocessors: [],
        postprocessors: [],
      };
      contextOptions.document.measures = contextOptions.measures;

      validate(contextOptions);

      expect(calledCount).toEqual(2);
    });
  });
});
