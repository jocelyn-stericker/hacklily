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

import MusicXML             = require("musicxml-interfaces");
import _                    = require("lodash");
import invariant            = require("react/lib/invariant");

import Engine               = require("./engine");
import SMuFL                = require("../models/smufl");

class BarlineModel implements Export.IBarlineModel {

    /*---- I.1 IModel ---------------------------------------------------------------------------*/

    /** @prototype only */
    divCount:        number;

    /** defined externally */
    staffIdx:        number;

    /** @prototype */
    frozenness:      Engine.IModel.FrozenLevel;

    modelDidLoad$(segment$: Engine.Measure.ISegment): void {
        // todo
    }

    validate$(cursor$: Engine.ICursor): void {
        if (!isFinite(this.barStyle.data) || this.barStyle.data === null) {
            this.barStyle.data = MusicXML.BarStyleType.Regular;
        }
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

    footnote:       MusicXML.Footnote;
    level:          MusicXML.Level;

    /*---- II. BarlineModel (extension) ---------------------------------------------------------*/

    defaultX:       number;
    defaultY:       number;

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
            this.model = Object.create(model, {
                defaultX: {
                    get: () => this.barX
                }
            });
            this.model.defaultY = 0;
            this.x$ = cursor$.x$;
            this.division = cursor$.division$;

            this.yOffset = 0;   // TODO
            this.height = 20;   // TODO

            /*---- Geometry ---------------------------------------*/

            const lineWidths = cursor$.header.defaults.appearance.lineWidths;

            const barlineSep = SMuFL.bravura.engravingDefaults.barlineSeparation;
            switch(model.barStyle.data) {
                case MusicXML.BarStyleType.LightHeavy:
                    this.lineStarts = [0, lineWidths["light barline"].tenths + barlineSep*10];
                    this.lineWidths = [lineWidths["light barline"].tenths,
                        lineWidths["heavy barline"].tenths];
                    cursor$.x$ += lineWidths["light barline"].tenths + barlineSep*10 +
                        lineWidths["heavy barline"].tenths;
                    break;
                case MusicXML.BarStyleType.Regular:
                    this.lineStarts = [0];
                    this.lineWidths = [lineWidths["light barline"].tenths*10];
                    cursor$.x$ += lineWidths["light barline"].tenths*10;
                    break;
                default:
                    invariant(false, "Not implemented");
            }
        }

        /*---- ILayout ------------------------------------------------------*/

        // Constructed:

        model:          BarlineModel;
        x$:             number;
        division:       number;
        height:         number;
        yOffset:        number;

        /**
         * Set by layout engine.
         */
        barX:           number;

        // Prototype:

        mergePolicy:    Engine.IModel.HMergePolicy;
        boundingBoxes$: Engine.IModel.IBoundingRect[];
        renderClass:    Engine.IModel.Type;
        expandable:     boolean;

        /*---- Extensions ---------------------------------------------------*/

        lineStarts:      number[];
        lineWidths:      number[];
    }

    Layout.prototype.mergePolicy = Engine.IModel.HMergePolicy.Min;
    Layout.prototype.expandable = false;
    Layout.prototype.renderClass = Engine.IModel.Type.Barline;
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
        defaultX:   number;
        defaultY:   number;
    }

    export interface ILayout extends Engine.IModel.ILayout {
        model:      IBarlineModel;
        height:     number;
        yOffset:    number;

        lineStarts:      number[];
        lineWidths:      number[];
    }
}

export = Export;
