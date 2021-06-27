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

export const VERSION = process.env.SATIE_VERSION || "";

import SongImpl from "./engine_songImpl";
import { ISongClass } from "./document";

/* The web application API */
export { default as Application } from "./engine_application";

/* Root-scope interfaces: Songs, documents, models */
export { default as IHandler } from "./engine_application";

export * from "./document";
export const Song: ISongClass = SongImpl;

/* Experimental addons */
import { getGlyphCode as eGetGlyphCode } from "./private_smufl";
import { pageSizes as ePageSizes } from "./private_renderUtil";

import EClef from "./implAttributes_clefView";
import EKeySignature from "./implAttributes_keySignatureView";
import ETimeSignature from "./implAttributes_timeSignatureView";
import { getNativeKeyAccidentals } from "./implAttributes_attributesData";
import EDirection from "./implDirection_directionView";
import ENotation from "./implChord_notationView";

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
