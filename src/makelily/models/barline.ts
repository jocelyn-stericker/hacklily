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

class BarlineModel implements Export.IBarlineModel {

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
                "segno",
                "coda",
                "location",
                "codaAttrib",
                "wavyLine",
                "fermatas",
                "segnoAttrib",
                "divisions",
                "barStyle",
                "ending",
                "repeat",
                "footnote",
                "level"
            ], isChangedHere);
    }

    modelDidLoad$(segment$: Engine.Measure.ISegmentRef): void {
        // todo
    }

    validate$(cursor$: Engine.ICursor): void {
        // todo
    }

    layout(cursor$: Engine.ICursor): Export.ILayout {
        // mutates cursor$ as required.
        return new BarlineModel.Layout(this, cursor$);
    }

    /*---- I.2 C.MusicXML.Barline ---------------------------------------------------------------*/

    segno:          MusicXML.Segno;
    coda:           MusicXML.Coda;
    location:       MusicXML.BarlineLocation;
    codaAttrib:     string;
    wavyLine:       MusicXML.WavyLine;
    fermatas:       MusicXML.Fermata[];
    segnoAttrib:    string;
    divisions:      string;
    barStyle:       MusicXML.BarStyle;
    ending:         MusicXML.Ending;
    repeat:         MusicXML.Repeat;

    /*---- I.3 C.MusicXML.Editorial -------------------------------------------------------------*/

    footnote:           MusicXML.Footnote;
    level:              MusicXML.Level;

    /*---- Validation Implementations -----------------------------------------------------------*/

    constructor(spec: MusicXML.Barline) {
        _.forEach(spec, (value, key) => {
            (<any>this)[key] = value;
        });
    }

    toXML(): string {
        return MusicXML.barlineToXML(this);
    }

    inspect() {
        return this.toXML();
    }
}

BarlineModel.prototype.divCount = 0;
BarlineModel.prototype.frozenness = Engine.IModel.FrozenLevel.Warm;

module BarlineModel {
    export class Layout implements Export.ILayout {
        constructor(model: BarlineModel, cursor$: Engine.ICursor) {
            this.model = model;
            this.x$ = cursor$.x$;
            this.division = cursor$.division$;

            /*---- Geometry ---------------------------------------*/

            // cursor$.x$ += 0;
        }

        /*---- ILayout ------------------------------------------------------*/

        // Constructed:

        model: BarlineModel;
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
    Layout.prototype.priority = Engine.IModel.Type.Barline;
    Layout.prototype.boundingBoxes$ = [];
    Object.freeze(Layout.prototype.boundingBoxes$);
};

/**
 * Registers Barline in the factory structure passed in.
 */
function Export(constructors: { [key: number]: any }) {
    constructors[Engine.IModel.Type.Barline] = BarlineModel;
}

module Export {
    export interface IBarlineModel extends Engine.IModel, MusicXML.Barline {
    }

    export interface ILayout extends Engine.IModel.ILayout {
        model: IBarlineModel;
    }
}

export = Export;
