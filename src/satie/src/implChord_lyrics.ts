// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

import { reduce } from "lodash";

import type { Note, Lyric, Text } from "#/musicxml-interfaces";
import { NormalBold } from "#/musicxml-interfaces";

import type { IChord } from "./private_chordUtil";
import { getTextBB } from "./private_fontManager";
import { cssSizeToTenths } from "./private_renderUtil";

export const DEFAULT_LYRIC_SIZE = "22";
export const DEFAULT_FONT = "Alegreya";
export const SYLLABIC_SIZE = 20;

export function getChordLyricWidth(chord: IChord, scale40: number) {
  return reduce(
    chord,
    (maxWidth, note) => Math.max(maxWidth, getNoteLyricWidth(note, scale40)),
    0,
  );
}

export function getNoteLyricWidth(note: Note, scale40: number) {
  return reduce(
    note.lyrics,
    (maxWidth, lyric) => Math.max(maxWidth, getLyricWidth(lyric, scale40)),
    0,
  );
}

export function getLyricWidth(lyric: Lyric, scale40: number) {
  return reduce(
    lyric.lyricParts,
    (partWidth, lyricPart) => {
      if (lyricPart._class === "Syllabic") {
        return partWidth + SYLLABIC_SIZE;
      } else if (lyricPart._class === "Text") {
        const text = <Text>lyricPart;
        return (
          partWidth +
          getTextBB(
            text.fontFamily || DEFAULT_FONT,
            text.data,
            cssSizeToTenths(scale40, text.fontSize || DEFAULT_LYRIC_SIZE),
            text.fontWeight === NormalBold.Bold ? "bold" : null,
          ).right
        );
      }
      return 0;
    },
    0,
  );
}
