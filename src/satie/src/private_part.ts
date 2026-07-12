// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

/* eslint-disable no-shadow */

import { some, filter } from "lodash";

import type { PartList, PartGroup, ScorePart } from "#/musicxml-interfaces";
import { StartStop } from "#/musicxml-interfaces";

export function scoreParts(scoreParts: PartList): ScorePart[] {
  return <ScorePart[]>(
    filter(scoreParts, (scorePart) => scorePart._class === "ScorePart")
  );
}

export function groupsForPart(
  scoreParts: PartList,
  partID: string,
): PartGroup[] {
  let groups: PartGroup[] = [];

  some(scoreParts, (partOrGroup) => {
    if (partOrGroup._class === "PartGroup") {
      const group = <PartGroup>partOrGroup;
      if (group.type === StartStop.Start) {
        groups.push(group);
      } else {
        groups = filter(
          groups,
          (currGroup) => currGroup.number !== group.number,
        );
      }
    } else {
      const part = <ScorePart>partOrGroup;
      if (part.id === partID) {
        return true;
      }
    }

    return false;
  });

  return groups;
}
