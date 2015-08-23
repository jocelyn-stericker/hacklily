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

import {StaffDetails, Attributes, StartStop} from "musicxml-interfaces";

import {clone, forEach} from "lodash";

import {IAttributes} from "../engine";

export interface ISpec {
    before: IAttributes.ISnapshot;
    current: Attributes;
    staff: number;
    measure: number;
}

export function create({before, current, staff, measure}: ISpec) {
    let currentClefs = current.clefs || [];
    let currentTimes = current.times || [];
    let currentTransposes = current.transposes || [];
    let currentKS = current.keySignatures || [];

    let snapshot: IAttributes.ISnapshot = {
        measure,
        divisions: current.divisions || before.divisions,
        partSymbol: current.partSymbol || before.partSymbol,
        clef: currentClefs[staff] || before.clef,
        time: currentTimes[0] || before.time, // TODO: time signatures per staff
        staffDetails: createStaffDetailsSnapshot(current.staffDetails[staff],
            clone(before.staffDetails || {})),
        transpose: currentTransposes[staff] || before.transpose,
        instruments: current.instruments || before.instruments,
        keySignature: currentKS[0] || before.keySignature,
        directives: current.directives,
        staves: current.staves || before.staves,
        measureStyle: createMeasureStyleSnapshot(current,
            JSON.parse(JSON.stringify(before.measureStyle || <IAttributes.IMeasureStyle> {})))
    };

    return snapshot;
}

function createStaffDetailsSnapshot(newStaffDetails: StaffDetails, staffDetails: StaffDetails) {
    newStaffDetails.capo = newStaffDetails.capo || staffDetails.capo;
    newStaffDetails.showFrets = newStaffDetails.showFrets || staffDetails.showFrets;
    newStaffDetails.staffLines = newStaffDetails.staffLines || staffDetails.staffLines;
    newStaffDetails.staffSize = newStaffDetails.staffSize || staffDetails.staffSize;
    newStaffDetails.staffTunings = newStaffDetails.staffTunings || staffDetails.staffTunings;
    newStaffDetails.staffType = newStaffDetails.staffType || staffDetails.staffType;
    return newStaffDetails;
}

function createMeasureStyleSnapshot(current: Attributes, style: IAttributes.IMeasureStyle) {
    let multipleRestInitiatedHere: boolean;
    forEach(current.measureStyles, currentMeasureStyle => {
        if (currentMeasureStyle.slash) {
            if (currentMeasureStyle.slash.type === StartStop.Stop) {
                delete style.slash;
            } else {
                style.slash = currentMeasureStyle.slash;
            }
        }

        if (currentMeasureStyle.beatRepeat) {
            if (currentMeasureStyle.beatRepeat.type === StartStop.Stop) {
                delete style.beatRepeat;
            } else {
                style.beatRepeat = currentMeasureStyle.beatRepeat;
            }
        }

        if (currentMeasureStyle.measureRepeat) {
            if (currentMeasureStyle.measureRepeat.type === StartStop.Stop) {
                delete style.measureRepeat;
            } else {
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
        let {count, useSymbols} = style.multipleRest;
        if (count - 1) {
            style.multipleRest = {
                count: count - 1,
                useSymbols: useSymbols
            };
        } else {
            style.multipleRest = null;
        }
    }
    return style;
};

