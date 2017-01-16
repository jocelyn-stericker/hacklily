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

import {IAny} from "musicxml-interfaces/operations";

import {IMeasure, IMeasurePart} from "./document_measure";
import {ISegment} from "./document_measure";

import {IAttributesSnapshot} from "./private_attributesSnapshot";
import {MAX_SAFE_INTEGER} from "./private_util";
import {cloneObject} from "./private_util";

function getSplit(segment: ISegment, maxDiv: number, isVoice: boolean): number {
    let divs = 0;
    let split = 0;
    do {
        divs += (segment[split].divCount || 0);
        if (divs <= maxDiv || !isVoice) {
            ++split;
        }
    } while (divs <= maxDiv && segment[split]);
    return split;
}

export default class DivisionOverflowException extends Error {
    maxDiv: number;
    oldParts: {
        [id: string]: IMeasurePart;
    };
    newParts: {
        [id: string]: IMeasurePart;
    } = {};
    measure: IMeasure;
    attributes: IAttributesSnapshot;

    constructor(maxDiv: number, measure: IMeasure, attributes: IAttributesSnapshot) {
        super();
        this.measure = measure;
        this.message = "DivisionOverflowException: max division should be " +
            `${maxDiv} in measure ${this.measure.idx}`;
        this.stack = (new Error).stack;
        this.maxDiv = maxDiv;
        this.oldParts = {
            "P1": {
                voices: measure.parts["P1"].voices.map(segment => {
                    if (!segment) {
                        return null;
                    }
                    let split = getSplit(segment, maxDiv, true);
                    let ov = <any> segment.slice(0, split);
                    return ov;
                }),
                staves: measure.parts["P1"].staves.map(segment => {
                    if (!segment) {
                        return null;
                    }
                    let split = getSplit(segment, maxDiv, false);
                    let os = <any> segment.slice(0, split);

                    return os.filter((item: any) => item._class !== "Barline");
                }),
            },
        };
        this.newParts = {
            "P1": {
                voices: measure.parts["P1"].voices.map(segment => {
                    if (!segment) {
                        return null;
                    }
                    let split = getSplit(segment, maxDiv, true);
                    let ov = <any> segment.slice(split);
                    return ov;
                }),
                staves: measure.parts["P1"].staves.map(segment => {
                    if (!segment) {
                        return null;
                    }
                    let split = getSplit(segment, maxDiv, false);
                    let os = <any> segment.slice(split);
                    return os;
                }),
            },
        };
        this.attributes = attributes;
    }

    getOperations(): IAny[] {
        return cloneObject([
            {
                ld: this.measure,
                li: {
                    uuid: this.measure.uuid,
                    parts: this.oldParts,
                },
                p: ["measures", this.measure.idx],
            },
            {
                li: {
                    uuid: Math.floor(Math.random() * MAX_SAFE_INTEGER),
                    parts: this.newParts,
                },
                p: ["measures", this.measure.idx + 1],
            },
        ]);
    }
}
