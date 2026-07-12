// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2017-present Jocelyn Stericker <jocelyn@nettek.ca>

import type { Clef, Key, Time } from "#/musicxml-interfaces";
import type {
  IClefBuilder,
  IKeyBuilder,
  ITimeBuilder,
} from "#/musicxml-interfaces/builders";
import { buildClef, buildKey, buildTime } from "#/musicxml-interfaces/builders";

export function parseClef(clefLy: string): Clef {
  let sign = "G";
  let line = 2;
  let clefOctaveChange: string | undefined;

  if (clefLy.indexOf("treble") > -1) {
    sign = "G";
    line = 2;
  } else if (clefLy.indexOf("bass") > -1) {
    sign = "F";
    line = 4;
  } else if (clefLy.indexOf("alto") > -1) {
    sign = "C";
    line = 3;
  } else if (clefLy.indexOf("tenor") > -1) {
    sign = "C";
    line = 4;
  } else if (clefLy.indexOf("tab") > -1) {
    sign = "TAB";
    line = 5;
  } else if (clefLy.indexOf("percussion") > -1) {
    sign = "percussion";
    line = 3;
  }

  if (clefLy.match(/\^.*8/)) {
    clefOctaveChange = "1";
  }
  if (clefLy.match(/\^.*15/)) {
    clefOctaveChange = "2";
  }
  if (clefLy.match(/_.*8/)) {
    clefOctaveChange = "-1";
  }
  if (clefLy.match(/_.*15/)) {
    clefOctaveChange = "-2";
  }

  return buildClef(
    (clef: IClefBuilder): IClefBuilder =>
      clef.clefOctaveChange(clefOctaveChange).line(line).sign(sign),
  );
}

const roots: string[] = [
  "ces",
  "ges",
  "des",
  "aes",
  "ees",
  "bes",
  "f",
  "c",
  "g",
  "d",
  "a",
  "e",
  "b",
  "fis",
  "cis",
  "gis",
  "dis",
  "ais",
];

export function parseKeySig(keyLy: string): Key {
  const root: string = keyLy.toLowerCase().trim().split(" ")[0];
  const rootIdx: number = roots.indexOf(root);
  let fifths = 0;
  let mode = "major";

  if (rootIdx !== -1 && keyLy.indexOf("\\minor") !== -1) {
    mode = "minor";
    fifths = rootIdx - 10;
  } else if (rootIdx !== -1 && keyLy.indexOf("\\major") !== -1) {
    mode = "major";
    fifths = rootIdx - 7;
  }

  return buildKey(
    (key: IKeyBuilder): IKeyBuilder => key.fifths(fifths).mode(mode),
  );
}

export function parseTime(timeLy: string): Time {
  let beatTypes: number[] = [4];
  let beats: string[] = ["4"];

  const match: RegExpMatchArray = timeLy.match(/(\d+)\/(\d+)/);
  if (match && match.length > 1 && match[1].length && match[2].length) {
    beats = [match[1]];
    beatTypes = [parseInt(match[2], 10)];
  }

  return buildTime(
    (time: ITimeBuilder): ITimeBuilder =>
      time.beatTypes(beatTypes).beats(beats),
  );
}
