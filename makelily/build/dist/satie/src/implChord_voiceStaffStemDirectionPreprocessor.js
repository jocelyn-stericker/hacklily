"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
var lodash_1 = require("lodash");
exports.default = voiceStaffStemDirection;
function voiceStaffStemDirection(measures) {
    lodash_1.forEach(measures, function (measure) {
        lodash_1.forEach(measure.parts, function (part) {
            var staffToVoices = {};
            lodash_1.forEach(part.voices, function (voice) {
                lodash_1.forEach(voice, function (model) {
                    if (model.staffIdx) {
                        staffToVoices[model.staffIdx] = staffToVoices[model.staffIdx] || {};
                        var voices = staffToVoices[model.staffIdx];
                        voices[voice.owner] = staffToVoices[model.staffIdx][voice.owner] || [];
                        voices[voice.owner].push(model);
                    }
                });
            });
            lodash_1.forEach(staffToVoices, function (staff) {
                if (Object.keys(staff).length > 1) {
                    lodash_1.forEach(staff[1], function (els) {
                        els.satieDirection = 1;
                    });
                    lodash_1.forEach(staff[2], function (els) {
                        els.satieDirection = -1;
                    });
                }
            });
        });
    });
    return measures;
}
//# sourceMappingURL=implChord_voiceStaffStemDirectionPreprocessor.js.map