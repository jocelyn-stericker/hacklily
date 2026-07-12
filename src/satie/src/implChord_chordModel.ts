// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

/**
 * @file models/chord.ts A model that represents 1 or more notes in the same
 * voice, starting on the same beat, and each with the same duration. Any
 * number of these notes may be rests.
 */

import type { MultipleRest, Tremolo } from "#/musicxml-interfaces";

import type { IModel, ILayout } from "./document";
import { Type } from "./document";
import type { IBeamLayout } from "./implChord_beamLayout";
import ChordModelImpl from "./implChord_chordImpl";
import type { IChord } from "./private_chordUtil";

/**
 * Registers Chord in the factory structure passed in.
 */
export default function ChordModel(constructors: {
  [key: number]: any;
  [key: string]: Type;
}) {
  constructors["Note"] = Type.Chord;
  constructors[Type.Chord] = ChordModelImpl;
}

export interface IChordModel extends IModel, IChord {}
export interface IDetachedChordModel extends IModel, IChord {
  stemX: () => number;
  satieLedger: number[];
  noteheadGlyph: string[];
  satieMultipleRest: MultipleRest;
  satieUnbeamedTuplet: IBeamLayout;
}
export interface IChordLayout extends ILayout {
  model: IDetachedChordModel;
  minSpaceBefore: number;
  minSpaceAfter: number;
  satieBeam: IBeamLayout;
  satieStem: {
    direction: number;
    stemHeight: number;
    stemStart: number;
    tremolo?: Tremolo;
  };
  satieFlag: string;
}
