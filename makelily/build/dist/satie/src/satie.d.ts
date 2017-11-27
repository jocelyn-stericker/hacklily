/// <reference types="lodash" />
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
export declare const VERSION: string;
import { ISongClass } from "./document";
export { default as Application } from "./engine_application";
export { default as IHandler } from "./engine_application";
export { Document, IModel, Type, IMeasure, IMeasurePart, ISong, ISongClass, IMouseEvent, ISegment } from "./document";
export declare const Song: ISongClass;
import EClef from "./implAttributes_clefView";
import EKeySignature from "./implAttributes_keySignatureView";
import ETimeSignature from "./implAttributes_timeSignatureView";
import { getNativeKeyAccidentals } from "./implAttributes_attributesData";
import EDirection from "./implDirection_directionView";
import ENotation from "./implChord_notationView";
export { requireFont } from "./private_fontManager";
import eCreatePatch from "./engine_createPatch";
export { PartBuilder, StaffBuilder, DocumentBuilder, MeasureBuilder, VoiceBuilder } from "./engine_createPatch";
export declare module Addons {
    const getGlyphCode: ((name: string) => string) & _.MemoizedFunction;
    const pageSizes: {
        name: string;
        lilypondName: string;
        width: number;
        height: number;
        unit: string;
    }[];
    const Clef: typeof EClef;
    const KeySignature: typeof EKeySignature;
    const TimeSignature: typeof ETimeSignature;
    const Direction: typeof EDirection;
    const NotationView: typeof ENotation;
    const getAccidentalsFromKey: typeof getNativeKeyAccidentals;
}
export declare module Patch {
    const createPatch: typeof eCreatePatch;
}
