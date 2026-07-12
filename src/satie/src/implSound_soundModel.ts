// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2015-present Jocelyn Stericker <jocelyn@nettek.ca>

import { forEach } from "lodash";

import type {
  MidiInstrument,
  Play,
  Offset,
  MidiDevice,
  Sound,
} from "#/musicxml-interfaces";
import { serializeSound } from "#/musicxml-interfaces";

import type { IModel, ILayout } from "./document";
import { Type } from "./document";
import type { IBoundingRect } from "./private_boundingRect";
import type { IReadOnlyValidationCursor, LayoutCursor } from "./private_cursor";

class SoundModel implements ISoundModel {
  /*---- I.1 IModel ---------------------------------------------------------------------------*/

  divCount = 0;

  /** defined externally */
  staffIdx: number;

  /*---- I.2 Sound -----------------------------------------------------------------------*/

  softPedal: string;
  midiInstruments: MidiInstrument[];
  pan: string;
  tocoda: string;
  decapo: boolean;
  divisions: number;
  pizzicato: boolean;
  coda: string;
  segno: string;
  elevation: string;
  fine: string;
  damperPedal: string;
  dynamics: string;
  plays: Play[];
  offset: Offset;
  sostenutoPedal: string;
  dalsegno: string;
  midiDevices: MidiDevice[];
  tempo: string;
  forwardRepeat: boolean;

  /*---- I.3 C.TimeOnly -----------------------------------------------------------------------*/

  timeOnly: string;

  /*---- Implementation -----------------------------------------------------------------------*/

  constructor(spec: Sound) {
    forEach<any>(spec, (value, key) => {
      (this as any)[key] = value;
    });
  }

  refresh(_cursor: IReadOnlyValidationCursor): void {
    // todo
  }

  getLayout(cursor: LayoutCursor): ISoundLayout {
    // mutates cursor as required.
    return new SoundModel.Layout(this, cursor);
  }

  toXML(): string {
    return `${serializeSound(this)}\n<forward><duration>${
      this.divCount
    }</duration></forward>\n`;
  }

  inspect() {
    return this.toXML();
  }

  calcWidth(_shortest: number) {
    return 0;
  }

  static Layout = class Layout implements ISoundLayout {
    constructor(model: SoundModel, cursor: LayoutCursor) {
      this.model = model;
      this.x = cursor.segmentX;
      this.division = cursor.segmentDivision;
    }

    /*---- ILayout ------------------------------------------------------*/

    // Constructed:

    model: SoundModel;
    x: number;
    division: number;

    // Prototype:

    boundingBoxes: IBoundingRect[] = [];
    renderClass: Type = Type.Sound;
    expandPolicy = "none" as const;
  };
}

/**
 * Registers Sound in the factory structure passed in.
 */
export default function Export(constructors: { [key: number]: any }) {
  constructors[Type.Sound] = SoundModel;
}

export interface ISoundModel extends IModel, Sound {}

export interface ISoundLayout extends ILayout {
  model: ISoundModel;
}
