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

import MusicXML         = require("musicxml-interfaces");
import _                = require("lodash");

import Engine           = require("./engine");

class SoundModel implements Export.ISoundModel {

    /*---- I.1 IModel ---------------------------------------------------------------------------*/

    /** @prototype only */
    divCount:        number;

    /** defined externally */
    staffIdx:        number;

    /** @prototype */
    frozenness:      Engine.IModel.FrozenLevel;

    get fields(): string[] {
        var isChangedHere = (prop: string) => {
            return ("_" + prop) in this;
        };

        return _.filter(
            [
                "divisions",
                "partSymbol",
                "measureStyle",
                "staffDetails",
                "transpose",
                "staves",
                "instruments",
                "directive",
                "clefs",
                "time",
                "keySignature",
                "footnote",
                "level"
            ], isChangedHere);
    }

    modelDidLoad$(segment$: Engine.Measure.ISegment): void {
        // todo
    }

    validate$(cursor$: Engine.ICursor): void {
        // todo
    }

    layout(cursor$: Engine.ICursor): Export.ILayout {
        // mutates cursor$ as required.
        return new SoundModel.Layout(this, cursor$);
    }

    /*---- I.2 C.MusicXML.Sound ------------------------------------------------------------*/

    softPedal:          string;
    midiInstruments:    MusicXML.MidiInstrument[];
    pan:                string;
    tocoda:             string;
    decapo:             boolean;
    divisions:          string;
    pizzicato:          boolean;
    coda:               string;
    segno:              string;
    elevation:          string;
    fine:               string;
    damperPedal:        string;
    dynamics:           string;
    plays:              MusicXML.Play[];
    offset:             MusicXML.Offset;
    sostenutoPedal:     string;
    dalsegno:           string;
    midiDevices:        MusicXML.MidiDevice[];
    tempo:              string;
    forwardRepeat:      boolean;

    /*---- I.3 C.MusicXML.TimeOnly --------------------------------------------------------------*/

    timeOnly:           string;

    /*---- Validation Implementations -----------------------------------------------------------*/

    constructor(spec: MusicXML.Sound) {
        _.forEach(spec, (value, key) => {
            (<any>this)[key] = value;
        });
    }

    toXML(): string {
        return MusicXML.soundToXML(this);
    }

    inspect() {
        return this.toXML();
    }
}

SoundModel.prototype.divCount = 0;
SoundModel.prototype.frozenness = Engine.IModel.FrozenLevel.Warm;

module SoundModel {
    export class Layout implements Export.ILayout {
        constructor(model: SoundModel, cursor$: Engine.ICursor) {
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

        mergePolicy: Engine.IModel.HMergePolicy;
        boundingBoxes$: Engine.IModel.IBoundingRect[];
        priority: Engine.IModel.Type;
        expandable: boolean;
    }

    Layout.prototype.mergePolicy = Engine.IModel.HMergePolicy.Min;
    Layout.prototype.expandable = false;
    Layout.prototype.priority = Engine.IModel.Type.Sound;
    Layout.prototype.boundingBoxes$ = [];
    Object.freeze(Layout.prototype.boundingBoxes$);
};

/**
 * Registers Sound in the factory structure passed in.
 */
function Export(constructors: { [key: number]: any }) {
    constructors[Engine.IModel.Type.Sound] = SoundModel;
}

module Export {
    export interface ISoundModel extends Engine.IModel, MusicXML.Sound {
    }

    export interface ILayout extends Engine.IModel.ILayout {
        model: ISoundModel;
    }
}

export = Export;
