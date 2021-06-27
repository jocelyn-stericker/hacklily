/**
 * @source: https://github.com/emilyskidsister/satie/
 *
 * @license
 * (C) Jocelyn Stericker <jocelyn@nettek.ca> 2015.
 * Part of the Satie music engraver <https://github.com/emilyskidsister/satie>.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import {
  MidiInstrument,
  Play,
  Offset,
  MidiDevice,
  Sound,
  serializeSound,
} from "musicxml-interfaces";
import { forEach } from "lodash";

import { IModel, ILayout, Type } from "./document";

import { IReadOnlyValidationCursor, LayoutCursor } from "./private_cursor";
import { IBoundingRect } from "./private_boundingRect";

class SoundModel implements ISoundModel {
  /*---- I.1 IModel ---------------------------------------------------------------------------*/

  divCount: number = 0;

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
    expandPolicy: "none" = "none";
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
