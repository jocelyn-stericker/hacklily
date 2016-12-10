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

import {BarStyleType} from "musicxml-interfaces";
import {buildNote} from "musicxml-interfaces/builders";

import IMeasure from "../../document/measure";
import IMeasurePart from "../../document/measurePart";
import ISegment from "../../document/segment";

import IAttributesSnapshot from "../../private/attributesSnapshot";
import IChord, {barDivisions} from "../../private/chord";
import {IFixupFn} from "../../private/layoutOptions";
import {MAX_SAFE_INTEGER} from "../../private/constants";
import {cloneObject} from "../../private/util";
import {subtract, calcDivisionsNoCtx} from "../../private/metre";

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

                    // Remove double barlines.
                    // TODO: is this ever not valid?
                    // TODO: should we ADD a double barline to newParts?
                    os = os.map((item: any) => {
                        if (item._class === "Barline") {
                            item = cloneObject(item);
                            if (item.barStyle.data === BarStyleType.LightHeavy) {
                                item.barStyle.data = BarStyleType.Regular;
                            }
                        }
                        return item;
                    });
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
        const oldDivisions = this.oldParts["P1"].voices[1].reduce((divs, item) =>
                  divs + (("length" in item) ?
                    calcDivisionsNoCtx(item as any, this.attributes.time, this.attributes.divisions) : 0), 0);
        const newDivisions = this.newParts["P1"].voices[1].reduce((divs, item) =>
                  divs + (("length" in item) ?
                    calcDivisionsNoCtx(item as any, this.attributes.time, this.attributes.divisions) : 0), 0);
        const totalDivisions = barDivisions(this.attributes);
        const oldDurationSpecs = subtract(totalDivisions, oldDivisions, {
                    division$: newDivisions,
                    staff: {
                        attributes: this.attributes,
                        totalDivisions: totalDivisions, // hack
                    }
                }, 0);
        const newDurationSpecs = subtract(totalDivisions, newDivisions, {
                    division$: newDivisions,
                    staff: {
                        attributes: this.attributes,
                        totalDivisions: totalDivisions, // hack
                    }
                }, 0);

        const oldRestSpecs: IChord[] = oldDurationSpecs.map(durationSpec => {
            let chord = [buildNote(note => note
                .rest({})
                .dots(durationSpec[0].dots)
                .noteType(durationSpec[0].noteType))
            ] as IChord;
            chord._class = "Chord";
            return chord;
        });

        const newRestSpecs: IChord[] = newDurationSpecs.map(durationSpec => {
            let chord = [buildNote(note => note
                .rest({})
                .dots(durationSpec[0].dots)
                .noteType(durationSpec[0].noteType))
            ] as IChord;
            chord._class = "Chord";
            return chord;
        });

        oldRestSpecs.forEach(spec => {
            this.oldParts["P1"].voices[1].push(spec as any);
        });

        newRestSpecs.forEach(spec => {
            this.newParts["P1"].voices[1].push(spec as any);
        });

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
