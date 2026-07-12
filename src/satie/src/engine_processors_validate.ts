// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

import invariant from "invariant";
import {
  reduce,
  forEach,
  flatten,
  filter,
  find,
  map,
  toPairs,
  last,
} from "lodash";

import type { Print } from "#/musicxml-interfaces";
import { BarStyleType } from "#/musicxml-interfaces";
import type { IAny } from "#/musicxml-interfaces/operations";

import type { ISegment } from "./document";
import { Type } from "./document";
import applyOp from "./engine_applyOp";
import createPatch from "./engine_createPatch";
import DivisionOverflowException from "./engine_divisionOverflowException";
import { normalizeDivisionsInPlace } from "./engine_divisions";
import { refreshMeasure, RefreshMode } from "./engine_processors_measure";
import type { IAttributesSnapshot } from "./private_attributesSnapshot";
import type { ILayoutOptions, IFixupFn } from "./private_layoutOptions";

/**
 * Reducer for a collection of functions, calling each one.
 */
function call<T>(memo: T, fn: (t: T) => T) {
  return fn(memo);
}

/**
 * Exception that indicates the measure must be validated again.
 * This can occur when a measure was modified in a position before the cursor.
 */
class RestartMeasureValidation {
  stack: string;
  constructor() {
    this.stack = new Error().stack;
  }
}

/**
 * Validate the measure.
 */
export default function validate(options: ILayoutOptions): void {
  options.measures = reduce(options.preprocessors, call, options.measures);

  let shouldTryAgain: boolean;

  /**
   * The operations that have been applied while validating.
   * This is for debug output when we get stuck in a loop.
   * This is reset every measure.
   */
  const debugFixupOperations: IAny[][] = [];

  /**
   * This function applies a patch as part of validation.
   *
   * A fixup function may have been passed in (if we are in an editor). If not, we just
   * mutate the song in-place. Note that this implementation does not allow for undo/redo.
   */
  function rootFixup(
    segment: ISegment,
    operations: IAny[],
    restartRequired: boolean,
  ) {
    debugFixupOperations.push(operations);
    if (options.fixup) {
      options.fixup(segment, operations);
    } else {
      forEach(operations, (operation) => {
        applyOp(
          options.preview,
          options.measures,
          options.modelFactory,
          operation,
          options.document,
          () => (options.preview = false),
        );
      });
    }

    if (restartRequired) {
      throw new RestartMeasureValidation();
    }
  }

  const rootFixupOpts = {
    debugFixupOperations,
    rootFixup,
  };

  do {
    shouldTryAgain = false;
    try {
      tryValidate(options, rootFixupOpts);
    } catch (err) {
      if (err instanceof DivisionOverflowException) {
        const ops = err.getOperations();
        // The restartRequired flag is false because we restart manually.
        rootFixup(null, createPatch(false, options.document, ops), false);

        shouldTryAgain = true;
      } else {
        throw err;
      }
    }
  } while (shouldTryAgain);
}

function tryValidate(
  options: ILayoutOptions,
  rootFixupOpts: { debugFixupOperations: IAny[][]; rootFixup: IFixupFn },
): void {
  const factory = options.modelFactory;
  const search = factory.search.bind(factory);

  let lastAttribs: { [part: string]: IAttributesSnapshot[] } = {};
  let lastPrint: Print = options.print;

  function withPart(segments: ISegment[], partID: string): ISegment[] {
    forEach(segments, (segment) => {
      if (segment) {
        segment.part = partID;
      }
    });
    return segments;
  }

  // Normalize divisions on a line:
  let allSegments: ISegment[] = [];
  forEach(options.measures, function validateMeasure(measure) {
    const voiceSegments = flatten(
      map(toPairs(measure.parts), (partx) =>
        withPart(partx[1].voices, partx[0]),
      ),
    );

    const staffSegments = flatten(
      map(toPairs(measure.parts), (partx) =>
        withPart(partx[1].staves, partx[0]),
      ),
    );

    allSegments = allSegments.concat(
      filter(voiceSegments.concat(staffSegments), (s) => !!s),
    );
  });
  normalizeDivisionsInPlace(factory, allSegments, 0);
  // TODO: check if a measure hence becomes dirty?

  let tries = 0;
  forEach(options.measures, function validateMeasure(measure) {
    const cleanliness =
      options.document.cleanlinessTracking.measures[measure.uuid];
    if (cleanliness && cleanliness.clean) {
      lastAttribs = cleanliness.clean.attributes;
      lastPrint = cleanliness.clean.print;
      return;
    }

    rootFixupOpts.debugFixupOperations = [];

    // Fixups can require multiple passes.
    for (let tryAgain = true; tryAgain;) {
      if (++tries > 100) {
        console.warn(
          "-------------- too many fixups: aborting -------------- ",
        );
        console.warn(
          JSON.stringify(rootFixupOpts.debugFixupOperations, null, 2),
        );
        throw new Error("Internal Satie Error: fixup loop!");
      }
      tryAgain = false;
      try {
        const voiceSegments = flatten(
          map(toPairs(measure.parts), (partx) =>
            withPart(partx[1].voices, partx[0]),
          ),
        );

        const staffSegments = flatten(
          map(toPairs(measure.parts), (partx) =>
            withPart(partx[1].staves, partx[0]),
          ),
        );

        const segments = filter(
          voiceSegments.concat(staffSegments),
          (s) => !!s,
        );

        forEach(staffSegments, function (segment, idx) {
          if (!segment) {
            return;
          }
          invariant(segment.ownerType === "staff", "Expected staff segment");
          lastAttribs[segment.part] = lastAttribs[segment.part] || [];

          function ensureHeader(type: Type) {
            if (!search(segment, 0, type).length) {
              if (segment.owner === 1) {
                rootFixupOpts.rootFixup(
                  segment,
                  [
                    {
                      p: [
                        String(measure.uuid),
                        "parts",
                        segment.part,
                        "staves",
                        segment.owner,
                        0,
                      ],

                      li: {
                        _class: Type[type],
                      },
                    },
                  ],
                  false,
                );
              } else {
                const proxy = factory.create(Type.Proxy);
                const proxiedSegment: ISegment = find(
                  staffSegments,
                  (potentialProxied) =>
                    potentialProxied &&
                    potentialProxied.part === segment.part &&
                    potentialProxied.owner === 1,
                );
                const target = search(proxiedSegment, 0, type)[0];
                (<any>proxy).target = target;
                (<any>proxy).staffIdx = idx;
                let tidx = -1;
                for (let i = 0; i < proxiedSegment.length; ++i) {
                  if (proxiedSegment[i] === target) {
                    tidx = i;
                    break;
                  }
                }
                invariant(tidx !== -1, "Could not find required model.");
                // Warning: without fixup.
                // STOPSHIP: Also add ability to remove/retarget proxy
                segment.splice(tidx, 0, proxy);
              }
            }
          }
          ensureHeader(Type.Print);
          ensureHeader(Type.Attributes);
          if (!search(segment, segment.length - 1, Type.Barline).length) {
            // Make sure the barline ends up at the end.
            const patches = createPatch(
              false,
              options.document,
              measure.uuid,
              segment.part,
              (part) =>
                part.staff(
                  segment.owner,
                  (staff) =>
                    staff.insertBarline((barline) =>
                      barline.barStyle({
                        data:
                          measure.uuid === last(options.document.measures).uuid
                            ? BarStyleType.LightHeavy
                            : BarStyleType.Regular,
                      }),
                    ),
                  segment.length,
                ),
            );
            rootFixupOpts.rootFixup(segment, patches, false);
          }
        });

        const outcome = refreshMeasure({
          noAlign: true,
          mode: RefreshMode.RefreshModel,
          document: options.document,
          factory: factory,
          fixup: rootFixupOpts.rootFixup,
          header: options.header,
          lineBarOnLine: NaN,
          lineCount: NaN,
          lineIndex: NaN,
          lineShortest: NaN,
          lineTotalBarsOnLine: NaN,
          measure: measure,
          measureX: 0,
          preview: options.preview,
          print: lastPrint,
          segments: segments,
          attributes: lastAttribs,
          singleLineMode: options.singleLineMode,
        });
        lastAttribs = outcome.attributes;
        lastPrint = outcome.print;
      } catch (ex) {
        if (ex instanceof RestartMeasureValidation) {
          tryAgain = true;
        } else {
          throw ex;
        }
      }
    }
  });
}
