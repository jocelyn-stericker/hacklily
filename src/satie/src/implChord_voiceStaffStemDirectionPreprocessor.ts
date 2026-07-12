// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

import { forEach } from "lodash";

import type { IModel, IMeasure } from "./document";

export type StaffToVoicesType = {
  [staff: number]: { [voice: number]: IModel[] };
  [staff: string]: { [voice: number]: IModel[] };
};

export default voiceStaffStemDirection;

function voiceStaffStemDirection(measures: IMeasure[]): IMeasure[] {
  forEach(measures, (measure) => {
    forEach(measure.parts, (part) => {
      const staffToVoices: StaffToVoicesType = {};
      forEach(part.voices, (voice) => {
        forEach(voice, (model) => {
          if (model.staffIdx) {
            staffToVoices[model.staffIdx] = staffToVoices[model.staffIdx] || {};
            const voices = staffToVoices[model.staffIdx];
            voices[voice.owner] =
              staffToVoices[model.staffIdx][voice.owner] || [];
            voices[voice.owner].push(model);
          }
        });
      });
      forEach(staffToVoices, (staff: { [voice: number]: IModel[] }) => {
        if (Object.keys(staff).length > 1) {
          forEach(staff[1], (els) => {
            (<any>els).satieDirection = 1;
          });
          forEach(staff[2], (els) => {
            (<any>els).satieDirection = -1;
          });
        }
      });
    });
  });
  return measures;
}
