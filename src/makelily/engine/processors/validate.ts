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

import MusicXML = require("musicxml-interfaces");
import _ = require("lodash");
import invariant = require("react/lib/invariant");

import IModel from "../imodel";
import Context from "../context";
import {IMutableMeasure, ISegment, normalizeDivisions$} from "../measure";
import {ILayoutOptions, ILinesLayoutState} from "../options";
import {setCurrentMeasureList} from "../escapeHatch";

import {reduceMeasure, DivisionOverflowException} from "./measure";

export default function validate(options$: ILayoutOptions, memo$: ILinesLayoutState): void {
    options$.measures = <any> _.reduce(options$.preprocessors, call, options$.measures);

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

    let lastAttribs: {[part: string]: MusicXML.Attributes} = {};

    function withPart(segments: ISegment[], partID: string): ISegment[] {
        _.forEach(segments, segment => {
            if (segment) {
                segment.part = partID;
            }
        });
        return segments;
    }

    // Normalize divisions on a line:
    let allSegments: ISegment[] = [];
    _.forEach(options$.measures, function validateMeasure(measure) {
        let voiceSegments$ = <ISegment[]>
            _.flatten(_.map(_.pairs(measure.parts),
                        partx => withPart(partx[1].voices, partx[0])));

        let staffSegments$ = <ISegment[]>
            _.flatten(_.map(_.pairs(measure.parts),
                        partx => withPart(partx[1].staves, partx[0])));

        allSegments = allSegments.concat(_.filter(voiceSegments$.concat(staffSegments$), s => !!s));
    });
    normalizeDivisions$(allSegments, 0);
    // TODO: check if a measure hence becomes dirty?

    _.forEach(options$.measures, function validateMeasure(measure) {
        if (!(measure.uuid in memo$.clean$)) {
            let voiceSegments$ = <ISegment[]>
                _.flatten(_.map(_.pairs(measure.parts),
                            partx => withPart(partx[1].voices, partx[0])));

            let staffSegments$ = <ISegment[]>
                _.flatten(_.map(_.pairs(measure.parts),
                            partx => withPart(partx[1].staves, partx[0])));

            let measureCtx = Context.IMeasure.detach(measure, 0);
            let segments = _.filter(voiceSegments$.concat(staffSegments$), s => !!s);

            _.forEach(staffSegments$, function(segment, idx) {
                if (!segment) {
                    return;
                }
                function ensureHeader(type: IModel.Type) {
                    if (!search(segment, 0, type).length) {
                        if (idx === 1) {
                            segment.splice(0, 0, factory.create(type));
                        } else {
                            let proxy = factory.create(IModel.Type.Proxy);
                            let target = search(staffSegments$[1], 0, type)[0];
                            (<any>proxy).target = target;
                            (<any>proxy).staffIdx = idx;
                            let tidx = -1;
                            for (let i = 0; i < staffSegments$[1].length; ++i) {
                                if (staffSegments$[1][i] === target) {
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
                    const divs = _.reduce(segment, (divs, model) => divs + model.divCount, 1);
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
                prevByStaff: null,
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
    mutator(_.find(options.measures, {"uuid": measureUUID}));
    // XXX: Call layout
    throw "Not implemented";
}
