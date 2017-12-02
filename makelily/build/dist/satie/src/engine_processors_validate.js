"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
var lodash_1 = require("lodash");
var invariant = require("invariant");
var musicxml_interfaces_1 = require("musicxml-interfaces");
var document_1 = require("./document");
var engine_createPatch_1 = require("./engine_createPatch");
var engine_applyOp_1 = require("./engine_applyOp");
var engine_divisions_1 = require("./engine_divisions");
var engine_divisionOverflowException_1 = require("./engine_divisionOverflowException");
var engine_processors_measure_1 = require("./engine_processors_measure");
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
function validate(options) {
    options.measures = lodash_1.reduce(options.preprocessors, call, options.measures);
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
            lodash_1.forEach(operations, function (operation) {
                engine_applyOp_1.default(options.preview, options.measures, options.modelFactory, operation, options.document, function () { return options.preview = false; });
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
            if (err instanceof engine_divisionOverflowException_1.default) {
                var ops = err.getOperations();
                // The restartRequired flag is false because we restart manually.
                rootFixup(null, engine_createPatch_1.default(false, options.document, ops), false);
                shouldTryAgain = true;
            }
            else {
                throw err;
            }
        }
    } while (shouldTryAgain);
}
exports.default = validate;
function tryValidate(options, rootFixupOpts) {
    var factory = options.modelFactory;
    var search = factory.search.bind(factory);
    var lastAttribs = {};
    var lastPrint = options.print;
    function withPart(segments, partID) {
        lodash_1.forEach(segments, function (segment) {
            if (segment) {
                segment.part = partID;
            }
        });
        return segments;
    }
    // Normalize divisions on a line:
    var allSegments = [];
    lodash_1.forEach(options.measures, function validateMeasure(measure) {
        var voiceSegments = lodash_1.flatten(lodash_1.map(lodash_1.toPairs(measure.parts), function (partx) { return withPart(partx[1].voices, partx[0]); }));
        var staffSegments = lodash_1.flatten(lodash_1.map(lodash_1.toPairs(measure.parts), function (partx) { return withPart(partx[1].staves, partx[0]); }));
        allSegments = allSegments.concat(lodash_1.filter(voiceSegments.concat(staffSegments), function (s) { return !!s; }));
    });
    engine_divisions_1.normalizeDivisionsInPlace(factory, allSegments, 0);
    // TODO: check if a measure hence becomes dirty?
    var tries = 0;
    lodash_1.forEach(options.measures, function validateMeasure(measure) {
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
                var voiceSegments = lodash_1.flatten(lodash_1.map(lodash_1.toPairs(measure.parts), function (partx) { return withPart(partx[1].voices, partx[0]); }));
                var staffSegments_1 = lodash_1.flatten(lodash_1.map(lodash_1.toPairs(measure.parts), function (partx) { return withPart(partx[1].staves, partx[0]); }));
                var segments = lodash_1.filter(voiceSegments.concat(staffSegments_1), function (s) { return !!s; });
                lodash_1.forEach(staffSegments_1, function (segment, idx) {
                    if (!segment) {
                        return;
                    }
                    invariant(segment.ownerType === "staff", "Expected staff segment");
                    lastAttribs[segment.part] = lastAttribs[segment.part] || [];
                    function ensureHeader(type) {
                        if (!search(segment, 0, type).length) {
                            if (segment.owner === 1) {
                                rootFixupOpts.rootFixup(segment, [{
                                        p: [
                                            String(measure.uuid),
                                            "parts",
                                            segment.part,
                                            "staves",
                                            segment.owner,
                                            0
                                        ],
                                        li: {
                                            _class: document_1.Type[type]
                                        }
                                    }], false);
                            }
                            else {
                                var proxy = factory.create(document_1.Type.Proxy);
                                var proxiedSegment = lodash_1.find(staffSegments_1, function (potentialProxied) {
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
                    ensureHeader(document_1.Type.Print);
                    ensureHeader(document_1.Type.Attributes);
                    if (!search(segment, segment.length - 1, document_1.Type.Barline).length) {
                        // Make sure the barline ends up at the end.
                        var patches = engine_createPatch_1.default(false, options.document, measure.uuid, segment.part, function (part) { return part.staff(segment.owner, function (staff) { return staff
                            .insertBarline(function (barline) { return barline
                            .barStyle({
                            data: measure.uuid === lodash_1.last(options.document.measures).uuid ?
                                musicxml_interfaces_1.BarStyleType.LightHeavy : musicxml_interfaces_1.BarStyleType.Regular,
                        }); }); }, segment.length); });
                        rootFixupOpts.rootFixup(segment, patches, false);
                    }
                });
                var outcome = engine_processors_measure_1.refreshMeasure({
                    noAlign: true,
                    mode: engine_processors_measure_1.RefreshMode.RefreshModel,
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