/** 
 * (C) Josh Netterfield <joshua@nettek.ca> 2015.
 * Part of the Satie music engraver <https://github.com/ripieno/satie>.
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

"use strict";

import {reduce, forEach, flatten, filter, find, map, pairs} from "lodash";
import invariant = require("invariant");

import IAttributes from "../iattributes";
import IModel from "../imodel";
import Context from "../context";
import {IMutableMeasure, ISegment, OwnerType, normalizeDivisions$} from "../measure";
import {ILayoutOptions, ILinesLayoutState} from "../options";
import {setCurrentMeasureList} from "../escapeHatch";

import {reduceMeasure, DivisionOverflowException} from "./measure";

export default function validate(options$: ILayoutOptions, memo$: ILinesLayoutState): void {
    options$.measures = <any> reduce(options$.preprocessors, call, options$.measures);

    let shouldTryAgain: boolean;

    do {
        shouldTryAgain = false;
        try {
            tryValidate(options$, memo$);
        } catch(err) {
            if (err instanceof DivisionOverflowException) {
                (<DivisionOverflowException>err).resolve$(options$.measures);
                shouldTryAgain = true;
            } else {
                throw err;
            }
        }
    } while(shouldTryAgain);
}

function call<T>(memo: T, fn: (t: T) => T) {
    return fn(memo);
}

function tryValidate(options$: ILayoutOptions, memo$: ILinesLayoutState): void {
    let factory = options$.modelFactory;
    let search = factory.search.bind(factory);

    setCurrentMeasureList(options$.measures);

    let lastAttribs: {[part: string]: IAttributes.ISnapshot[]} = {};

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
            flatten(map(pairs(measure.parts), partx => withPart(partx[1].voices, partx[0])));

        let staffSegments$ = <ISegment[]>
            flatten(map(pairs(measure.parts), partx => withPart(partx[1].staves, partx[0])));

        allSegments = allSegments.concat(filter(voiceSegments$.concat(staffSegments$), s => !!s));
    });
    normalizeDivisions$(allSegments, 0);
    // TODO: check if a measure hence becomes dirty?

    forEach(options$.measures, function validateMeasure(measure) {
        if (!(measure.uuid in memo$.clean$)) {
            let voiceSegments$ = <ISegment[]>
                flatten(map(pairs(measure.parts), partx => withPart(partx[1].voices, partx[0])));

            let staffSegments$ = <ISegment[]>
                flatten(map(pairs(measure.parts), partx => withPart(partx[1].staves, partx[0])));

            let measureCtx = Context.IMeasure.detach(measure, 0);
            let segments = filter(voiceSegments$.concat(staffSegments$), s => !!s);

            forEach(staffSegments$, function(segment, idx) {
                if (!segment) {
                    return;
                }
                invariant(segment.ownerType === OwnerType.Staff, "Expected staff segment");
                lastAttribs[segment.part] = lastAttribs[segment.part] || [];

                function ensureHeader(type: IModel.Type) {
                    if (!search(segment, 0, type).length) {
                        if (segment.owner === 1) {
                            segment.splice(0, 0, factory.create(type));
                        } else {
                            let proxy = factory.create(IModel.Type.Proxy);
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
                            segment.splice(tidx, 0, proxy);
                        }
                    }
                }
                ensureHeader(IModel.Type.Print);
                ensureHeader(IModel.Type.Attributes);
                if (!search(segment, segment.length - 1, IModel.Type.Barline).length) {
                    // Make sure the barline ends up at the end.
                    const divs = reduce(segment, (divs, model) => divs + model.divCount, 1);
                    if (divs !== 0) {
                        const spacer = factory.create(IModel.Type.Spacer);
                        spacer.divCount = divs;
                        segment.splice(segment.length, 0, spacer);
                    }
                    segment.splice(segment.length, 0, factory.create(IModel.Type.Barline));
                }
            });

            let outcome = reduceMeasure({
                attributes: lastAttribs,
                header: options$.header,
                line: null,
                measure: measureCtx,
                padEnd: false,
                segments: segments,
                _approximate: true,
                _detached: true,
                _noAlign: true,
                _validateOnly: true, // Just validate, don't make a layout
                factory: factory
            });
            lastAttribs = outcome.attributes;
        }
    });

    setCurrentMeasureList(null);
}

export function mutate(options: ILayoutOptions,
        memo$: ILinesLayoutState, measureUUID: number,
        mutator: (measure$: IMutableMeasure) => void) {
    delete memo$.clean$[measureUUID];
    delete memo$.width$[measureUUID];
    mutator(find(options.measures, {"uuid": measureUUID}));
    // XXX: Call layout
    throw "Not implemented";
}
