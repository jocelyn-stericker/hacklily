// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

/* eslint-disable import/first */

export const VERSION =
  (typeof process !== "undefined" && process.env.SATIE_VERSION) || "";

import type { ISongClass } from "./document";
import SongImpl from "./engine_songImpl";

/* The web application API */
export { default as Application } from "./engine_application";

/* Root-scope interfaces: Songs, documents, models */
export { default as IHandler } from "./engine_application";

export * from "./document";
export const Song: ISongClass = SongImpl;

import { getNativeKeyAccidentals } from "./implAttributes_attributesData";
import EClef from "./implAttributes_clefView";
import EKeySignature from "./implAttributes_keySignatureView";
import ETimeSignature from "./implAttributes_timeSignatureView";
import ENotation from "./implChord_notationView";
import EDirection from "./implDirection_directionView";
import { pageSizes as ePageSizes } from "./private_renderUtil";
/* Experimental addons */
import { getGlyphCode as eGetGlyphCode } from "./private_smufl";

export { requireFont } from "./private_fontManager";

/* Patches */
import eCreatePatch from "./engine_createPatch";
export {
  PartBuilder,
  StaffBuilder,
  DocumentBuilder,
  MeasureBuilder,
  VoiceBuilder,
} from "./engine_createPatch";

export const Addons = {
  eGetGlyphCode,
  ePageSizes,

  Clef: EClef,
  KeySignature: EKeySignature,
  TimeSignature: ETimeSignature,
  Direction: EDirection,
  NotationView: ENotation,
  getAccidentalsFromKey: getNativeKeyAccidentals,
};

export const Patch = {
  createPatch: eCreatePatch,
};
