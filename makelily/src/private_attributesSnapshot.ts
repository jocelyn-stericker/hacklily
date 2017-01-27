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

import {Attributes, StartStop, PartSymbol, Clef, Time, StaffDetails,
    Transpose, Key, Directive, MeasureStyle} from "musicxml-interfaces";

import {clone, forEach} from "lodash";

/**
 * A snapshot of the current attribute state
 */
export interface IAttributesSnapshot extends Attributes {
    measure: number;
    divisions: number;
    partSymbol: PartSymbol;

    clefs: Clef[];
    times: Time[];
    transposes: Transpose[];
    keySignatures: Key[];

    clef: Clef;
    measureStyle: MeasureStyle & {multipleRestInitiatedHere?: boolean};
    time: Time;
    staffDetails: StaffDetails[];
    transpose: Transpose;
    staves: number;
    instruments: string;
    keySignature: Key;
    directives: Directive[];
}

export interface IAttributesSnapshotSpec {
    before: IAttributesSnapshot;
    current: Attributes;
    staff: number;
    measure: number;
}

export function createAttributesSnapshot({before, current, staff, measure}: IAttributesSnapshotSpec) {
    let currentClefs = current.clefs || [];
    let currentTimes = current.times || [];
    let currentTransposes = current.transposes || [];
    let currentKS = current.keySignatures || [];

    let staffDetails: StaffDetails[] = [];
    let beforeDetails = before.staffDetails || [];
    let currentDetails = current.staffDetails || [];
    for (let i = 0; i < beforeDetails.length || i < currentDetails.length; ++i) {
        staffDetails[i] = createStaffDetailsSnapshot(currentDetails[i] || {},
                clone(beforeDetails[i] || {}));
    }

    let clefs: Clef[] = [];
    let beforeClefs = before.clefs || [];
    for (let i = 0; i < beforeClefs.length || i < currentClefs.length; ++i) {
        clefs[i] = currentClefs[i] || beforeClefs[i];
    }
    let times: Time[] = [];
    let beforeTimes = before.times || [];
    for (let i = 0; i < beforeTimes.length || i < currentTimes.length; ++i) {
        times[i] = currentTimes[i] || beforeTimes[i];
    }
    let transposes: Transpose[] = [];
    let beforeTransposes = before.transposes || [];
    for (let i = 0; i < beforeTransposes.length || i < currentTransposes.length; ++i) {
        transposes[i] = currentTransposes[i] || beforeTransposes[i];
    }
    let keySignatures: Key[] = [];
    let beforeKS = before.keySignatures || [];
    for (let i = 0; i < beforeKS.length || i < currentKS.length; ++i) {
        keySignatures[i] = currentKS[i] || beforeKS[i];
    }

    let snapshot: IAttributesSnapshot = {
        measure,
        divisions: current.divisions || before.divisions,
        partSymbol: current.partSymbol || before.partSymbol,
        clef: currentClefs[staff] || before.clef,
        time: currentTimes[0] || before.time, // TODO: time signatures per staff
        staffDetails,
        transpose: currentTransposes[staff] || before.transpose,
        instruments: current.instruments || before.instruments,
        keySignature: currentKS[0] || before.keySignature,
        directives: current.directives,
        staves: current.staves || before.staves,
        measureStyle: createMeasureStyleSnapshot(current,
            JSON.parse(JSON.stringify(before.measureStyle || <MeasureStyle> {}))),

        clefs,
        times,
        transposes,
        keySignatures,
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

function createMeasureStyleSnapshot(current: Attributes, style: MeasureStyle & {multipleRestInitiatedHere: boolean}) {
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
