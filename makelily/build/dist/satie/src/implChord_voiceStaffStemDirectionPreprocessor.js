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
import { forEach } from "lodash";
export default voiceStaffStemDirection;
function voiceStaffStemDirection(measures) {
    forEach(measures, function (measure) {
        forEach(measure.parts, function (part) {
            var staffToVoices = {};
            forEach(part.voices, function (voice) {
                forEach(voice, function (model) {
                    if (model.staffIdx) {
                        staffToVoices[model.staffIdx] = staffToVoices[model.staffIdx] || {};
                        var voices = staffToVoices[model.staffIdx];
                        voices[voice.owner] =
                            staffToVoices[model.staffIdx][voice.owner] || [];
                        voices[voice.owner].push(model);
                    }
                });
            });
            forEach(staffToVoices, function (staff) {
                if (Object.keys(staff).length > 1) {
                    forEach(staff[1], function (els) {
                        els.satieDirection = 1;
                    });
                    forEach(staff[2], function (els) {
                        els.satieDirection = -1;
                    });
                }
            });
        });
    });
    return measures;
}
//# sourceMappingURL=implChord_voiceStaffStemDirectionPreprocessor.js.map