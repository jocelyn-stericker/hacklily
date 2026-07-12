// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

import invariant from "invariant";
import { flatten, map, values, filter } from "lodash";

import type { IModel } from "./document";

export interface ISegment extends Array<IModel> {
  owner: number;
  ownerType: "staff" | "voice";
  divisions: number;
  part?: string;
}

export interface IMeasurePart {
  voices: ISegment[];
  staves: ISegment[];
}

/**
 * Based on MusicXML's Measure, but with additional information, and with a staff/voice-seperated and
 * monotonic parts element.
 */
export interface IMeasure {
  idx: number; // 0-indexed, can change
  uuid: number;
  number: string; // 1-indexed
  implicit?: boolean;
  width?: number;
  nonControlling?: boolean;
  parts: {
    [id: string]: IMeasurePart;
  };

  /**
   * Incremented whenever anything in the measure changes.
   * Local only and monotonic.
   */
  version: number;
}

export function getMeasureSegments(measure: IMeasure): ISegment[] {
  const voiceSegments = flatten(
    map(values<IMeasurePart>(measure.parts), (part) => part.voices),
  );

  const staffSegments = flatten(
    map(values<IMeasurePart>(measure.parts), (part) => part.staves),
  );

  return filter(voiceSegments.concat(staffSegments), (s) => !!s);
}

export function reduceToShortestInSegments(
  shortest: number,
  segment: ISegment,
) {
  return segment.reduce(reduceToShortestInSegment, shortest);
}

export function reduceToShortestInSegment(shortest: number, model: IModel) {
  if (!(model.divCount >= 0)) {
    invariant(model.divCount >= 0, "Counts must exceed 0 in", model);
  }
  const divCount = model && model.divCount ? model.divCount : Number.MAX_VALUE;
  return Math.min(shortest, divCount);
}
