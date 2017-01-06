/**
 * @source: https://github.com/jnetterf/satie/
 *
 * @license
 * (C) Josh Netterfield <joshua@nettek.ca> 2016 - present.
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

import IMeasure from "../../document/measure";
import IMeasurePart from "../../document/measurePart";
import ISegment from "../../document/segment";

import IAttributesSnapshot from "../../private/attributesSnapshot";
import {IFixupFn} from "../../private/layoutOptions";
import {MAX_SAFE_INTEGER} from "../../private/constants";
import {cloneObject} from "../../private/util";

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

    resolve$(fixup: IFixupFn) {
        fixup(null, cloneObject([
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
        ]));
    }
}
