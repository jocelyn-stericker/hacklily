/**
 * @source: https://github.com/jnetterf/satie/
 *
 * @license
 * (C) Josh Netterfield <joshua@nettek.ca> 2015.
 * Part of the Satie music engraver <https://github.com/jnetterf/satie>.
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

import {MidiInstrument, Play, Offset, MidiDevice, Sound,
    serializeSound} from "musicxml-interfaces";
import {forEach} from "lodash";

import {IModel} from "./document_model";
import Type from "./document_types";

import {ICursor} from "./private_cursor";
import {IBoundingRect} from "./private_boundingRect";
import {ILayout} from "./document_model";

class SoundModel implements Export.ISoundModel {

    /*---- I.1 IModel ---------------------------------------------------------------------------*/

    /** @prototype only */
    divCount: number;

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

    validate(cursor$: ICursor): void {
        // todo
    }

    getLayout(cursor$: ICursor): Export.ISoundLayout {
        // mutates cursor$ as required.
        return new SoundModel.Layout(this, cursor$);
    }

    toXML(): string {
        return `${serializeSound(this)}\n<forward><duration>${this.divCount}</duration></forward>\n`;
    }

    inspect() {
        return this.toXML();
    }
}

SoundModel.prototype.divCount = 0;

module SoundModel {
    export class Layout implements Export.ISoundLayout {
        constructor(model: SoundModel, cursor$: ICursor) {
            this.model = model;
            this.x$ = cursor$.x$;
            this.division = cursor$.division$;

            /*---- Geometry ---------------------------------------*/

            // cursor$.x$ += 0;
        }

        /*---- ILayout ------------------------------------------------------*/

        // Constructed:

        model: SoundModel;
        x$: number;
        division: number;

        // Prototype:

        boundingBoxes$: IBoundingRect[];
        renderClass: Type;
        expandPolicy: "none";
    }

    Layout.prototype.expandPolicy = "none";
    Layout.prototype.renderClass = Type.Sound;
    Layout.prototype.boundingBoxes$ = [];
    Object.freeze(Layout.prototype.boundingBoxes$);
};

/**
 * Registers Sound in the factory structure passed in.
 */
function Export(constructors: { [key: number]: any }) {
    constructors[Type.Sound] = SoundModel;
}

module Export {
    export interface ISoundModel extends IModel, Sound {
    }

    export interface ISoundLayout extends ILayout {
        model: ISoundModel;
    }
}

export default Export;
