/**
 * @source: https://github.com/jnetterf/satie/
 *
 * @license
 * (C) Josh Netterfield <joshua@nettek.ca> 2015.
 * Part of the Satie music engraver <https://github.com/jnetterf/satie>.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import {reduce, forEach, flatten, filter, find, map, toPairs, last} from "lodash";
import * as invariant from "invariant";
import {Print, BarStyleType} from "musicxml-interfaces";
import {IAny} from "musicxml-interfaces/operations";

import Type from "../../document/types";
import ISegment, {normalizeDivisionsInPlace} from "../../document/segment";
import OwnerType from "../../document/ownerTypes";

import IAttributesSnapshot from "../../private/attributesSnapshot";
import ILayoutOptions, {IFixupFn} from "../../private/layoutOptions";
import ILinesLayoutState from "../../private/linesLayoutState";
import {detachMeasureContext} from "../../private/measureContext";

import createPatch from "../../patch/createPatch";

import applyOp from "../applyOp";

import DivisionOverflowException from "./divisionOverflowException";
import {reduceMeasure} from "./measure";

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
class RestartMeasureValidation {}

/**
 * Validate the measure.
 */
export default function validate(options$: ILayoutOptions, memo$: ILinesLayoutState): void {
    options$.measures = <any> reduce(options$.preprocessors, call, options$.measures);

    let shouldTryAgain: boolean;

    /**
     * The operations that have been applied while validating.
     * This is for debug output when we get stuck in a loop.
     * This is reset every measure.
     */
    let debugFixupOperations: IAny[][] = [];

    /**
     * This function applies a patch as part of validation.
     * 
     * A fixup function may have been passed in (if we are in an editor). If not, we just
     * mutate the song in-place. Note that this implementation does not allow for undo/redo.
     */
    function rootFixup(segment: ISegment, operations: IAny[], restartRequired: boolean) {
        debugFixupOperations.push(operations);
        if (options$.fixup) {
            options$.fixup(segment, operations);
        } else {
            forEach(operations, operation => {
                applyOp(options$.preview, options$.measures, options$.modelFactory, operation, memo$,
                    options$.document);
            });
        }

        if (restartRequired) {
            throw new RestartMeasureValidation();
        }
    }

    let rootFixupOpts$ = {
        debugFixupOperations,
        rootFixup,
    };

    do {
        shouldTryAgain = false;
        try {
            tryValidate(options$, memo$, rootFixupOpts$);
        } catch (err) {
            if (err instanceof DivisionOverflowException) {
                (<DivisionOverflowException>err).resolve$(rootFixup);
                shouldTryAgain = true;
            } else {
                throw err;
            }
        }
    } while (shouldTryAgain);
}

function tryValidate(options$: ILayoutOptions, memo$: ILinesLayoutState,
        rootFixupOpts$: {debugFixupOperations: IAny[][], rootFixup: IFixupFn}): void {
    let factory = options$.modelFactory;
    let search = factory.search.bind(factory);

    let lastAttribs: {[part: string]: IAttributesSnapshot[]} = {};
    let lastPrint: Print = options$.print$;

    function withPart(segments: ISegment[], partID: string): ISegment[] {
        forEach(segments, segment => {
            if (segment) {
                segment.part = partID;
            }
        });
        return segments;
    }

    // Normalize divisions on a line:
    let allSegments: ISegment[] = [];
    forEach(options$.measures, function validateMeasure(measure) {
        let voiceSegments$ = <ISegment[]>
            flatten(map(toPairs(measure.parts), partx => withPart(partx[1].voices, partx[0])));

        let staffSegments$ = <ISegment[]>
            flatten(map(toPairs(measure.parts), partx => withPart(partx[1].staves, partx[0])));

        allSegments = allSegments.concat(filter(voiceSegments$.concat(staffSegments$), s => !!s));
    });
    normalizeDivisionsInPlace(factory, allSegments, 0);
    // TODO: check if a measure hence becomes dirty?

    forEach(options$.measures, function validateMeasure(measure) {
        rootFixupOpts$.debugFixupOperations = [];
        if (memo$.clean$[measure.uuid]) {
            let voiceSegments$ = <ISegment[]>
                flatten(map(toPairs(measure.parts), partx => withPart(partx[1].voices, partx[0])));

            let staffSegments$ = <ISegment[]>
                flatten(map(toPairs(measure.parts), partx => withPart(partx[1].staves, partx[0])));
            let segments: ISegment[] = filter(voiceSegments$.concat(staffSegments$), s => !!s);

            forEach(segments, function(segment, idx) {
                lastAttribs[segment.part] = memo$.clean$[measure.uuid].attributes[segment.part];
            });
            return;
        }

        let tries = 0;
        // Fixups can require multiple passes.
        for (let tryAgain = true; tryAgain;) {
            if (++tries > 100) {
                console.warn("-------------- too many fixups: aborting -------------- ");
                console.warn(rootFixupOpts$.debugFixupOperations);
                throw new Error("Internal Satie Error: fixup loop!");
            }
            tryAgain = false;
            try {
                let voiceSegments$ = <ISegment[]>
                    flatten(map(toPairs(measure.parts), partx => withPart(partx[1].voices, partx[0])));

                let staffSegments$ = <ISegment[]>
                    flatten(map(toPairs(measure.parts), partx => withPart(partx[1].staves, partx[0])));

                let measureCtx = detachMeasureContext(measure, 0);

                let segments = filter(voiceSegments$.concat(staffSegments$), s => !!s);

                forEach(staffSegments$, function(segment, idx) {
                    if (!segment) {
                        return;
                    }
                    invariant(segment.ownerType === OwnerType.Staff, "Expected staff segment");
                    lastAttribs[segment.part] = lastAttribs[segment.part] || [];

                    function ensureHeader(type: Type) {
                        if (!search(segment, 0, type).length) {
                            if (segment.owner === 1) {
                                rootFixupOpts$.rootFixup(segment, [{

                                    p: [
                                        String(measure.uuid),
                                        "parts",
                                        segment.part,
                                        "staves",
                                        segment.owner,
                                        0
                                    ],

                                    li: {
                                        _class: Type[type]
                                    }

                                }], false);
                            } else {
                                let proxy = factory.create(Type.Proxy);
                                let proxiedSegment: ISegment = find(staffSegments$, potentialProxied =>
                                    potentialProxied &&
                                    potentialProxied.part === segment.part &&
                                    potentialProxied.owner === 1);
                                let target = search(proxiedSegment, 0, type)[0];
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
                        const patches = createPatch(false, options$.document, measure.uuid,
                            segment.part,
                            part => part.staff(
                                segment.owner,
                                staff => staff
                                    .insertBarline(barline => barline
                                        .barStyle({
                                            data: measure.uuid === last(options$.document.measures).uuid ?
                                                BarStyleType.LightHeavy : BarStyleType.Regular,
                                        })
                                    ),
                                segment.length
                            )
                        );
                        rootFixupOpts$.rootFixup(segment, patches, false);
                    }
                });

                let outcome = reduceMeasure({
                    document: options$.document,
                    attributes: lastAttribs,
                    print: lastPrint,
                    header: options$.header,
                    line: null,
                    measure: measureCtx,
                    padEnd: false,
                    segments: segments,
                    _approximate: true,
                    _detached: true,
                    _noAlign: true,
                    _validateOnly: true, // Just validate, don't make a layout
                    factory: factory,
                    preview: options$.preview,
                    memo$,
                    fixup: rootFixupOpts$.rootFixup
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
