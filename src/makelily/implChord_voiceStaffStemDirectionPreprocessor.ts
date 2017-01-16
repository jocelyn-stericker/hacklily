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

import {forEach} from "lodash";

import {IModel} from "./document_model";
import {IMeasure} from "./document_measure";

export type StaffToVoicesType = {
    [staff: number]: {[voice: number]: IModel[]};
    [staff: string]: {[voice: number]: IModel[]};
}

export default voiceStaffStemDirection;

function voiceStaffStemDirection(measures: IMeasure[]): IMeasure[] {
    forEach(measures, measure => {
        forEach(measure.parts, part => {
            let staffToVoices: StaffToVoicesType = {};
            forEach(part.voices, voice => {
                forEach(voice, model => {
                    if (model.staffIdx) {
                        staffToVoices[model.staffIdx] = staffToVoices[model.staffIdx] || {};
                        let voices = staffToVoices[model.staffIdx];
                        voices[voice.owner] = staffToVoices[model.staffIdx][voice.owner] || [];
                        voices[voice.owner].push(model);
                    }
                });
            });
            forEach(staffToVoices, (staff: {[voice: number]: IModel[]}) => {
                if (Object.keys(staff).length > 1) {
                    forEach(staff[1], els => {
                        (<any>els).satieDirection = 1;
                    });
                    forEach(staff[2], els => {
                        (<any>els).satieDirection = -1;
                    });
                }
            });
        });
    });
    return measures;
}
