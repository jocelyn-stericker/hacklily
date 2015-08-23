/**
 * (C) Josh Netterfield <joshua@nettek.ca> 2015.
 * Part of the Satie music engraver <https://github.com/ripieno/satie>.
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
    serialize as serializeToXML} from "musicxml-interfaces";
import {forEach} from "lodash";

import {ICursor, IModel, ISegment} from "../engine";

class SoundModel implements Export.ISoundModel {

    /*---- I.1 IModel ---------------------------------------------------------------------------*/

    /** @prototype only */
    divCount: number;

    /** defined externally */
    staffIdx: number;

    /** @prototype */
    frozenness: IModel.FrozenLevel;

    modelDidLoad$(segment$: ISegment): void {
        // todo
    }

    validate$(cursor$: ICursor): void {
        // todo
    }

    layout(cursor$: ICursor): Export.ILayout {
        // mutates cursor$ as required.
        return new SoundModel.Layout(this, cursor$);
    }

    /*---- I.2 Sound -----------------------------------------------------------------------*/

    softPedal: string;
    midiInstruments: MidiInstrument[];
    pan: string;
    tocoda: string;
    decapo: boolean;
    divisions: string;
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

    /*---- Validation Implementations -----------------------------------------------------------*/

    constructor(spec: Sound) {
        forEach(spec, (value, key) => {
            (<any>this)[key] = value;
        });
    }

    toXML(): string {
        return serializeToXML.sound(this);
    }

    inspect() {
        return this.toXML();
    }
}

SoundModel.prototype.divCount = 0;
SoundModel.prototype.frozenness = IModel.FrozenLevel.Warm;

module SoundModel {
    export class Layout implements Export.ILayout {
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

        boundingBoxes$: IModel.IBoundingRect[];
        renderClass: IModel.Type;
        expandPolicy: IModel.ExpandPolicy;
    }

    Layout.prototype.expandPolicy = IModel.ExpandPolicy.None;
    Layout.prototype.renderClass = IModel.Type.Sound;
    Layout.prototype.boundingBoxes$ = [];
    Object.freeze(Layout.prototype.boundingBoxes$);
};

/**
 * Registers Sound in the factory structure passed in.
 */
function Export(constructors: { [key: number]: any }) {
    constructors[IModel.Type.Sound] = SoundModel;
}

module Export {
    export interface ISoundModel extends IModel, Sound {
    }

    export interface ILayout extends IModel.ILayout {
        model: ISoundModel;
    }
}

export default Export;
