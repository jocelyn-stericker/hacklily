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

import {Time} from "musicxml-interfaces";
import {IAny} from "musicxml-interfaces/operations";
import * as invariant from "invariant";
import {times} from "lodash";

import IModel from "../../document/model";
import IDocument from "../../document/document";
import Type from "../../document/types";

import {rest} from "../chordUtil";
import IFactory from "../factory";
import {cloneObject} from "../util";

import checkRests from "./_checkRests";
import getTSString from "./_getTSString";
import * as D from "./_metreDurations";

export interface IRestSpec {
    readonly song: string;
    readonly models: IModel[];
}

export function voiceToRestSpec(segment: IModel[], factory: IFactory | IDocument) {
    const emptyRestSpec: IRestSpec = {song: "", models: []};
    return segment.reduce((restSpec: IRestSpec, model: IModel) => {
        invariant(!isNaN(model.divCount), "model %s must have a div count", model);
        invariant(model.divCount === parseInt(String(model.divCount), 10), "Expected %s to be an integer", model.divCount);
        const models = restSpec.models.concat(times(model.divCount, () => model));
        if (factory.modelHasType(model, Type.Chord) && rest(model)) {
            return {
                song: restSpec.song + "r" + times(model.divCount - 1, () => "_").join(""),
                models,
            };
        }
        return {
            song: restSpec.song + times(model.divCount, () => ".").join(""),
            models,
        };
    }, emptyRestSpec);
}

function _cleanupRests(pattern: string, time: Time) {
    // Now, call "checkRests" and apply the 
    const ts = getTSString(time);
    const next = () => checkRests(ts, pattern.length, pattern, {dotsAllowed: true});
    for (let status = next(); status !== "GOOD"; status = next()) {
        // Apply patches until we're in a good state.
        const cmd = status.split(" ");
        invariant(cmd[0] === "apply", "Unexpected instruction '%s'", status);
        invariant(parseInt(cmd[1], 10) === pattern.length,
            "Unexpected length change from %s to %s", cmd[1], pattern.length);
        const patch = cmd[2];
        let nextPattern = "";
        for (let i = 0; i < pattern.length; ++i) {
            if (patch[i] === ".") {
                if (nextPattern[i] !== "." && i && patch[i - 1] !== ".") {
                    nextPattern += "r";
                } else {
                    nextPattern += pattern[i];
                }
            } else {
                nextPattern += patch[i];
            }
        }
        pattern = nextPattern;
    }
    return pattern;
}

export function shortenRest(
        segment: IModel[],
        factory: IFactory | IDocument,
        time: Time,
        start: number,
        end: number,
        modelsInserted: number): {patches: IAny[], indexOffset: number} {

    invariant(start === parseInt(String(start), 10), "Expected start %s to be an integer", start);
    invariant(end === parseInt(String(end), 10), "Expected end %s to be an integer", end);

    const originalSpec = voiceToRestSpec(segment, factory);
    console.log("SR", start, end, originalSpec);

    // Naively shorten the rest.
    const naiveRestPattern =
        originalSpec.song.slice(0, start) + // Before rest shortened
        times(end - start, () => ".").join("") + // Rest shortened
        (originalSpec.song[end] === "." ? "." : "r") + // First character after rest
            originalSpec.song.slice(end + 1); // Other characters after rest

    // Correct the rests.
    const cleanRestPattern = _cleanupRests(naiveRestPattern, time);

    // We now need to make patches to turn originalSpec.song into cleanRestPattern.
    let patches: IAny[] = [];
    let indexOffset = 0;
    for (let i = 0; i < cleanRestPattern.length; ++i) {
        const originalModel = originalSpec.models[i];
        if (i === start) {
            indexOffset += modelsInserted;
        }
        if (cleanRestPattern[i] === "r") {
            let cleanRestEnd = i + 1;
            while (cleanRestPattern[cleanRestEnd] === "_") { ++cleanRestEnd; }

            const newDuration = D.makeDuration(
                cleanRestPattern.length / parseInt(time.beats[0], 10) * (4 / time.beatTypes[0]),
                time,
                cleanRestEnd - i
            );

            if (originalSpec.song[i] === "r") {
                // Check if the length of the rest needs to be changed
                let originalRestEnd = i + 1;
                while (originalSpec.song[originalRestEnd] === "_") { ++originalRestEnd; }
                if (cleanRestEnd !== originalRestEnd) {
                    if (!factory.modelHasType(originalModel, Type.Chord) ||!rest(originalModel)) {
                        throw new Error("Expected rest");
                    }
                    if (JSON.stringify(originalModel[0].dots) !== JSON.stringify(newDuration[0].dots)) {
                        patches.push({
                            od: originalModel[0].dots,
                            oi: newDuration[0].dots,
                            p: [segment.indexOf(originalModel) + indexOffset, 0, "dots"],
                        });
                    }

                    if (originalModel[0].noteType.duration !== newDuration[0].noteType.duration) {
                        patches.push({
                            od: originalModel[0].noteType.duration,
                            oi: newDuration[0].noteType.duration,
                            p: [segment.indexOf(originalModel) + indexOffset, 0, "noteType", "duration"],
                        });
                    }
                }
            } else {
                // New rest
                ++indexOffset;
                newDuration[0].rest = {};
                newDuration._class = "Chord";
                patches.push({
                    li: newDuration,
                    p: [segment.indexOf(originalModel) + indexOffset],
                });
            }
        } else if (cleanRestPattern[i] === "_") {
            if (originalSpec.song[i] === "r") {
                const model = originalSpec.models[i];
                patches.push({
                    ld: cloneObject(model),
                    p: [segment.indexOf(model) + indexOffset],
                });
                --indexOffset;
            }
        }
    }

    console.log("(modifyRests)", patches);
    return {
        patches,
        indexOffset,
    };
}
