/**
 * This file is part of Satie music engraver <https://github.com/emilyskidsister/satie>.
 * Copyright (C) Jocelyn Stericker <jocelyn@nettek.ca> 2015 - present.
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
import invariant from "invariant";
import { times, forEach } from "lodash";
import checkRests from "./private_metre_checkRests";
import getTSString from "./private_metre_getTSString";
import * as D from "./private_metre_metreDurations";
import { barDivisions } from "./private_chordUtil";
export function voiceToRestSpec(segment, attributes, _factory) {
    var emptyRestSpec = { song: "", models: [], modelsToKill: [] };
    var divsToSuppress = 0;
    var killIdx;
    var prevIdx = 0;
    var spec = segment.reduce(function (restSpec, model) {
        var divCount = model.newDivisions || 0;
        var oldDivCount = model.previousDivisions || 0;
        var restsAtEnd = model.previousDivisions > divCount
            ? "r" +
                times(model.previousDivisions - divCount - 1, function () { return "_"; }).join("")
            : "";
        var modelsToKill = restSpec.modelsToKill;
        if (divsToSuppress > 0) {
            var extraSong = divCount > divsToSuppress
                ? "r" + times(divCount - divsToSuppress - 1, function () { return "_"; }).join("")
                : "";
            divsToSuppress = Math.max(0, divsToSuppress - divCount);
            var newModelsToKill = modelsToKill.slice();
            newModelsToKill[killIdx] = newModelsToKill[killIdx] || [];
            newModelsToKill[killIdx].push(model);
            return {
                song: restSpec.song + extraSong,
                models: restSpec.models.concat(times(extraSong.length, function () { return "killed"; })),
                modelsToKill: newModelsToKill,
            };
        }
        else if (divCount === 0) {
            var newModelsToKill = modelsToKill.slice();
            newModelsToKill[prevIdx] = newModelsToKill[prevIdx] || [];
            newModelsToKill[prevIdx].push(model);
            return {
                song: restSpec.song,
                models: restSpec.models,
                modelsToKill: newModelsToKill,
            };
        }
        if (divCount) {
            prevIdx = restSpec.models.length + divCount;
        }
        var models = restSpec.models
            .concat(times(divCount, function () { return model; }))
            .concat(restsAtEnd.split("").map(function () { return null; }));
        if (divCount > oldDivCount) {
            killIdx = models.length;
            divsToSuppress = divCount - oldDivCount;
        }
        if (model.rest && !model.forced && divCount) {
            return {
                song: restSpec.song +
                    "r" +
                    times(divCount - 1, function () { return "_"; }).join("") +
                    restsAtEnd,
                models: models,
                modelsToKill: modelsToKill,
            };
        }
        return {
            song: restSpec.song + times(divCount, function () { return "."; }).join("") + restsAtEnd,
            models: models,
            modelsToKill: modelsToKill,
        };
    }, emptyRestSpec);
    invariant(spec.models.length === spec.song.length, "Invalid spec");
    var totalDivisions = barDivisions(attributes);
    var restsToAdd = (totalDivisions - (spec.song.length % totalDivisions)) % totalDivisions;
    return {
        song: restsToAdd
            ? spec.song.concat("r" + times(restsToAdd - 1, function () { return "_"; }).join(""))
            : spec.song,
        models: spec.models,
        modelsToKill: spec.modelsToKill,
    };
}
function _cleanupRests(pattern, time) {
    var ts = getTSString(time);
    var next = function () {
        return checkRests(ts, pattern.length, pattern, { dotsAllowed: true });
    };
    var operationsRemaining = 15;
    for (var status_1 = next(); status_1 !== "GOOD"; status_1 = next()) {
        if (!--operationsRemaining) {
            throw new Error("Rest cleanup timeout");
        }
        // Apply patches until we're in a good state.
        var cmd = status_1.split(" ");
        invariant(cmd[0] === "apply", "Unexpected instruction '%s'", status_1);
        invariant(parseInt(cmd[1], 10) === pattern.length, "Unexpected length change from %s to %s", cmd[1], pattern.length);
        var patch = cmd[2];
        var nextPattern = "";
        for (var i = 0; i < pattern.length; ++i) {
            if (patch[i] === ".") {
                if (nextPattern[i] !== "." && i && patch[i - 1] !== ".") {
                    nextPattern += "r";
                }
                else {
                    nextPattern += pattern[i];
                }
            }
            else {
                nextPattern += patch[i];
            }
        }
        pattern = nextPattern;
    }
    return pattern;
}
var DEBUG_simplifyRests = false;
export function simplifyRests(segment, factory, attributes) {
    var originalSpec = voiceToRestSpec(segment, attributes, factory);
    if (DEBUG_simplifyRests) {
        console.log("=== sr ===");
        console.log(JSON.stringify(segment, null, 2));
        console.log(originalSpec.modelsToKill);
        console.log(originalSpec.models);
    }
    // Correct the rests.
    var totalDivisions = barDivisions(attributes);
    var cleanRestPattern = "";
    for (var i = 0; i < originalSpec.song.length; i += totalDivisions) {
        cleanRestPattern += _cleanupRests(originalSpec.song.slice(i, i + totalDivisions), attributes.time);
    }
    // We now need to make patches to turn originalSpec.song into cleanRestPattern.
    var patches = [];
    var currIdx = -1;
    var currIdxOffset = 0;
    function killModel(model) {
        currIdx = model.idx + currIdxOffset;
        if (!model.newDivisions) {
            // We want to insert new models AFTER this one, but we're not actually removing it,
            // since this function only removes notes/rests
            currIdx = model.idx + currIdxOffset + 1;
        }
        else {
            invariant(segment.indexOf(model) > -1, "Model must be present in segment");
            patches.push({
                ld: model.toSpec(),
                p: [currIdx],
            });
            currIdxOffset -= 1;
        }
    }
    for (var i = 0; i < cleanRestPattern.length; ++i) {
        var originalModel = originalSpec.models[i];
        if (originalModel && originalModel !== "killed") {
            currIdx = originalModel.idx + currIdxOffset;
        }
        forEach(originalSpec.modelsToKill[i], killModel);
        if (cleanRestPattern[i] === "r") {
            var cleanRestEnd = i + 1;
            while (cleanRestPattern[cleanRestEnd] === "_") {
                ++cleanRestEnd;
            }
            var newDuration = D.makeDuration(attributes.divisions, attributes.time, cleanRestEnd - i);
            if (originalSpec.song[i] === "r" ||
                originalModel === "killed" ||
                !originalModel) {
                // Check if the length of the rest needs to be changed
                var originalRestEnd = i + 1;
                while (originalSpec.song[originalRestEnd] === "_") {
                    ++originalRestEnd;
                }
                if (!originalModel || originalModel === "killed") {
                    newDuration[0].rest = newDuration[0].rest || {};
                    newDuration._class = "Chord";
                    patches.push({
                        li: newDuration,
                        p: [currIdx],
                    });
                    ++currIdx;
                    ++currIdxOffset;
                }
                else if (cleanRestEnd !== originalRestEnd) {
                    if (!originalModel.rest) {
                        throw new Error("Expected rest");
                    }
                    var newDots = times(originalModel.newDots, function () { return ({}); });
                    if (JSON.stringify(newDots) !== JSON.stringify(newDuration[0].dots)) {
                        patches.push({
                            od: newDots,
                            oi: newDuration[0].dots,
                            p: [currIdx, "notes", 0, "dots"],
                        });
                    }
                    if (originalModel.newCount !== newDuration[0].noteType.duration) {
                        patches.push({
                            od: originalModel.newCount,
                            oi: newDuration[0].noteType.duration,
                            p: [currIdx, "notes", 0, "noteType", "duration"],
                        });
                    }
                }
            }
            else {
                // New rest
                newDuration[0].rest = newDuration[0].rest || {};
                newDuration._class = "Chord";
                patches.push({
                    li: newDuration,
                    p: [currIdx],
                });
                ++currIdx;
                ++currIdxOffset;
            }
        }
        else if (cleanRestPattern[i] === "_" || cleanRestPattern[i] === ".") {
            if (originalSpec.song[i] === "r") {
                var model = originalSpec.models[i];
                if (model) {
                    if (model === "killed") {
                        throw new Error("Not reached");
                    }
                    invariant(!!model, "Cannot remove undefined model");
                    invariant(segment.indexOf(model) > -1, "Model must be present in segment");
                    patches.push({
                        ld: model.toSpec(),
                        p: [currIdx],
                    });
                    currIdxOffset -= 1;
                }
            }
        }
    }
    forEach(originalSpec.modelsToKill[originalSpec.models.length], killModel);
    if (DEBUG_simplifyRests) {
        console.log(JSON.stringify(patches, null, 2));
    }
    return patches;
}
//# sourceMappingURL=private_metre_modifyRest.js.map