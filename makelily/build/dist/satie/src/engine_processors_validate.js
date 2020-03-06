/**
 * This file is part of Satie music engraver <https://github.com/jnetterf/satie>.
 * Copyright (C) Joshua Netterfield <joshua.ca> 2015 - present.
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
import { reduce, forEach, flatten, filter, find, map, toPairs, last, } from "lodash";
import invariant from "invariant";
import { BarStyleType } from "musicxml-interfaces";
import { Type } from "./document";
import createPatch from "./engine_createPatch";
import applyOp from "./engine_applyOp";
import { normalizeDivisionsInPlace } from "./engine_divisions";
import DivisionOverflowException from "./engine_divisionOverflowException";
import { refreshMeasure, RefreshMode } from "./engine_processors_measure";
/**
 * Reducer for a collection of functions, calling each one.
 */
function call(memo, fn) {
    return fn(memo);
}
/**
 * Exception that indicates the measure must be validated again.
 * This can occur when a measure was modified in a position before the cursor.
 */
var RestartMeasureValidation = /** @class */ (function () {
    function RestartMeasureValidation() {
        this.stack = new Error().stack;
    }
    return RestartMeasureValidation;
}());
/**
 * Validate the measure.
 */
export default function validate(options) {
    options.measures = reduce(options.preprocessors, call, options.measures);
    var shouldTryAgain;
    /**
     * The operations that have been applied while validating.
     * This is for debug output when we get stuck in a loop.
     * This is reset every measure.
     */
    var debugFixupOperations = [];
    /**
     * This function applies a patch as part of validation.
     *
     * A fixup function may have been passed in (if we are in an editor). If not, we just
     * mutate the song in-place. Note that this implementation does not allow for undo/redo.
     */
    function rootFixup(segment, operations, restartRequired) {
        debugFixupOperations.push(operations);
        if (options.fixup) {
            options.fixup(segment, operations);
        }
        else {
            forEach(operations, function (operation) {
                applyOp(options.preview, options.measures, options.modelFactory, operation, options.document, function () { return (options.preview = false); });
            });
        }
        if (restartRequired) {
            throw new RestartMeasureValidation();
        }
    }
    var rootFixupOpts = {
        debugFixupOperations: debugFixupOperations,
        rootFixup: rootFixup,
    };
    do {
        shouldTryAgain = false;
        try {
            tryValidate(options, rootFixupOpts);
        }
        catch (err) {
            if (err instanceof DivisionOverflowException) {
                var ops = err.getOperations();
                // The restartRequired flag is false because we restart manually.
                rootFixup(null, createPatch(false, options.document, ops), false);
                shouldTryAgain = true;
            }
            else {
                throw err;
            }
        }
    } while (shouldTryAgain);
}
function tryValidate(options, rootFixupOpts) {
    var factory = options.modelFactory;
    var search = factory.search.bind(factory);
    var lastAttribs = {};
    var lastPrint = options.print;
    function withPart(segments, partID) {
        forEach(segments, function (segment) {
            if (segment) {
                segment.part = partID;
            }
        });
        return segments;
    }
    // Normalize divisions on a line:
    var allSegments = [];
    forEach(options.measures, function validateMeasure(measure) {
        var voiceSegments = (flatten(map(toPairs(measure.parts), function (partx) {
            return withPart(partx[1].voices, partx[0]);
        })));
        var staffSegments = (flatten(map(toPairs(measure.parts), function (partx) {
            return withPart(partx[1].staves, partx[0]);
        })));
        allSegments = allSegments.concat(filter(voiceSegments.concat(staffSegments), function (s) { return !!s; }));
    });
    normalizeDivisionsInPlace(factory, allSegments, 0);
    // TODO: check if a measure hence becomes dirty?
    var tries = 0;
    forEach(options.measures, function validateMeasure(measure) {
        var cleanliness = options.document.cleanlinessTracking.measures[measure.uuid];
        if (cleanliness && cleanliness.clean) {
            lastAttribs = cleanliness.clean.attributes;
            lastPrint = cleanliness.clean.print;
            return;
        }
        rootFixupOpts.debugFixupOperations = [];
        var _loop_1 = function (tryAgain) {
            if (++tries > 100) {
                console.warn("-------------- too many fixups: aborting -------------- ");
                console.warn(JSON.stringify(rootFixupOpts.debugFixupOperations, null, 2));
                throw new Error("Internal Satie Error: fixup loop!");
            }
            tryAgain = false;
            try {
                var voiceSegments = (flatten(map(toPairs(measure.parts), function (partx) {
                    return withPart(partx[1].voices, partx[0]);
                })));
                var staffSegments_1 = (flatten(map(toPairs(measure.parts), function (partx) {
                    return withPart(partx[1].staves, partx[0]);
                })));
                var segments = filter(voiceSegments.concat(staffSegments_1), function (s) { return !!s; });
                forEach(staffSegments_1, function (segment, idx) {
                    if (!segment) {
                        return;
                    }
                    invariant(segment.ownerType === "staff", "Expected staff segment");
                    lastAttribs[segment.part] = lastAttribs[segment.part] || [];
                    function ensureHeader(type) {
                        if (!search(segment, 0, type).length) {
                            if (segment.owner === 1) {
                                rootFixupOpts.rootFixup(segment, [
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
                                ], false);
                            }
                            else {
                                var proxy = factory.create(Type.Proxy);
                                var proxiedSegment = find(staffSegments_1, function (potentialProxied) {
                                    return potentialProxied &&
                                        potentialProxied.part === segment.part &&
                                        potentialProxied.owner === 1;
                                });
                                var target = search(proxiedSegment, 0, type)[0];
                                proxy.target = target;
                                proxy.staffIdx = idx;
                                var tidx = -1;
                                for (var i = 0; i < proxiedSegment.length; ++i) {
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
                        var patches = createPatch(false, options.document, measure.uuid, segment.part, function (part) {
                            return part.staff(segment.owner, function (staff) {
                                return staff.insertBarline(function (barline) {
                                    return barline.barStyle({
                                        data: measure.uuid === last(options.document.measures).uuid
                                            ? BarStyleType.LightHeavy
                                            : BarStyleType.Regular,
                                    });
                                });
                            }, segment.length);
                        });
                        rootFixupOpts.rootFixup(segment, patches, false);
                    }
                });
                var outcome = refreshMeasure({
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
            }
            catch (ex) {
                if (ex instanceof RestartMeasureValidation) {
                    tryAgain = true;
                }
                else {
                    throw ex;
                }
            }
            out_tryAgain_1 = tryAgain;
        };
        var out_tryAgain_1;
        // Fixups can require multiple passes.
        for (var tryAgain = true; tryAgain;) {
            _loop_1(tryAgain);
            tryAgain = out_tryAgain_1;
        }
    });
}
//# sourceMappingURL=engine_processors_validate.js.map