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
import { StartStop, } from "musicxml-interfaces";
import { clone, forEach } from "lodash";
import { cloneObject } from "./private_util";
export function createAttributesSnapshot(_a) {
    var before = _a.before, current = _a.current, staff = _a.staff, measure = _a.measure;
    var currentClefs = current.clefs || [];
    var currentTimes = current.times || [];
    var currentTransposes = current.transposes || [];
    var currentKS = current.keySignatures || [];
    var staffDetails = [];
    var beforeDetails = before.staffDetails || [];
    var currentDetails = current.staffDetails || [];
    for (var i = 0; i < beforeDetails.length || i < currentDetails.length; ++i) {
        staffDetails[i] = createStaffDetailsSnapshot(currentDetails[i] || {}, clone(beforeDetails[i] || {}));
    }
    var clefs = [];
    var beforeClefs = before.clefs || [];
    for (var i = 0; i < beforeClefs.length || i < currentClefs.length; ++i) {
        clefs[i] = currentClefs[i] || beforeClefs[i];
    }
    var times = [];
    var beforeTimes = before.times || [];
    for (var i = 0; i < beforeTimes.length || i < currentTimes.length; ++i) {
        times[i] = currentTimes[i] || beforeTimes[i];
    }
    var transposes = [];
    var beforeTransposes = before.transposes || [];
    for (var i = 0; i < beforeTransposes.length || i < currentTransposes.length; ++i) {
        transposes[i] = currentTransposes[i] || beforeTransposes[i];
    }
    var keySignatures = [];
    var beforeKS = before.keySignatures || [];
    for (var i = 0; i < beforeKS.length || i < currentKS.length; ++i) {
        keySignatures[i] = currentKS[i] || beforeKS[i];
    }
    var snapshot = {
        measure: measure,
        divisions: current.divisions || before.divisions,
        partSymbol: current.partSymbol || before.partSymbol,
        clef: currentClefs[staff] || before.clef,
        time: currentTimes[0] || before.time,
        staffDetails: staffDetails,
        transpose: currentTransposes[staff] || before.transpose,
        instruments: current.instruments || before.instruments,
        keySignature: currentKS[0] || before.keySignature,
        directives: current.directives,
        staves: current.staves || before.staves,
        measureStyle: createMeasureStyleSnapshot(current, JSON.parse(JSON.stringify(before.measureStyle || {}))),
        clefs: clefs,
        times: times,
        transposes: transposes,
        keySignatures: keySignatures,
    };
    return snapshot;
}
function createStaffDetailsSnapshot(newStaffDetails, staffDetails) {
    newStaffDetails = cloneObject(newStaffDetails);
    newStaffDetails.capo = newStaffDetails.capo || staffDetails.capo;
    newStaffDetails.showFrets =
        newStaffDetails.showFrets || staffDetails.showFrets;
    newStaffDetails.staffLines =
        newStaffDetails.staffLines || staffDetails.staffLines;
    newStaffDetails.staffSize =
        newStaffDetails.staffSize || staffDetails.staffSize;
    newStaffDetails.staffTunings =
        newStaffDetails.staffTunings || staffDetails.staffTunings;
    newStaffDetails.staffType =
        newStaffDetails.staffType || staffDetails.staffType;
    return newStaffDetails;
}
function createMeasureStyleSnapshot(current, style) {
    var multipleRestInitiatedHere;
    forEach(current.measureStyles, function (currentMeasureStyle) {
        if (currentMeasureStyle.slash) {
            if (currentMeasureStyle.slash.type === StartStop.Stop) {
                delete style.slash;
            }
            else {
                style.slash = currentMeasureStyle.slash;
            }
        }
        if (currentMeasureStyle.beatRepeat) {
            if (currentMeasureStyle.beatRepeat.type === StartStop.Stop) {
                delete style.beatRepeat;
            }
            else {
                style.beatRepeat = currentMeasureStyle.beatRepeat;
            }
        }
        if (currentMeasureStyle.measureRepeat) {
            if (currentMeasureStyle.measureRepeat.type === StartStop.Stop) {
                delete style.measureRepeat;
            }
            else {
                style.measureRepeat = currentMeasureStyle.measureRepeat;
            }
        }
        if (currentMeasureStyle.multipleRest) {
            multipleRestInitiatedHere = true;
            style.multipleRestInitiatedHere = true;
            style.multipleRest = currentMeasureStyle.multipleRest;
        }
    });
    if (!multipleRestInitiatedHere) {
        style.multipleRestInitiatedHere = false;
    }
    if (style.multipleRest && !multipleRestInitiatedHere) {
        var _a = style.multipleRest, count = _a.count, useSymbols = _a.useSymbols;
        if (count - 1) {
            style.multipleRest = {
                count: count - 1,
                useSymbols: useSymbols,
            };
        }
        else {
            style.multipleRest = null;
        }
    }
    return style;
}
//# sourceMappingURL=private_attributesSnapshot.js.map