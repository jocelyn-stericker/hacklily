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

import _ = require("lodash");

import Engine = require("../engine");

function voiceStaffStemDirection(measures: Engine.Measure.IMutableMeasure[]):
        Engine.Measure.IMutableMeasure[] {
    _.forEach(measures, measure => {
        _.forEach(measure.parts, part => {
            let staffToVoices: {[staff: number]: {[voice: number]: Engine.IModel[]}} = {};
            _.forEach(part.voices, voice => {
                _.forEach(voice, model => {
                    if (model.staffIdx) {
                        staffToVoices[model.staffIdx] = staffToVoices[model.staffIdx] || {};
                        let voices = staffToVoices[model.staffIdx];
                        voices[voice.owner] = staffToVoices[model.staffIdx][voice.owner] || [];
                        voices[voice.owner].push(model);
                    }
                });
            });
            _.forEach(staffToVoices, (staff: {[voice: number]: Engine.IModel[]}) => {
                if (Object.keys(staff).length > 1) {
                    _.forEach(staff[1], els => {
                        (<any>els).satieDirection = 1;
                    });
                    _.forEach(staff[2], els => {
                        (<any>els).satieDirection = -1;
                    });
                }
            });
        });
    });
    return measures;
}

export = voiceStaffStemDirection;
