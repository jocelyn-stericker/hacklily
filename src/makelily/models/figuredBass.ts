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

import MusicXML = require("musicxml-interfaces");
import _ = require("lodash");

import {IModel, ISegment, ICursor} from "../engine";

class FiguredBassModel implements Export.IFiguredBassModel {

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
        // todo

        return new FiguredBassModel.Layout(this, cursor$);
    }

    /*---- I.2 MusicXML.FiguredBass -------------------------------------------------------------*/

    figures: MusicXML.Figure[];
    duration: number;
    parentheses: boolean;

    /*---- I.2.2 MusicXML.Editorial -------------------------------------------------------------*/

    footnote: MusicXML.Footnote;
    level: MusicXML.Level;

    /*---- I.2.3 MusicXML.Printout --------------------------------------------------------------*/

    printDot: boolean;
    printLyric: boolean;
    printObject: boolean;
    printSpacing: boolean;

    /*---- I.2.4 MusicXML.PrintStyle ------------------------------------------------------------*/

    /*---- MusicXML.PrintStyle >> Position --------------------------------------------------*/

    defaultX: number; // ignored for now
    relativeY: number;
    defaultY: number;
    relativeX: number;

    /*---- MusicXML.PrintStyle >> Font ------------------------------------------------------*/

    fontFamily: string;
    fontWeight: MusicXML.NormalBold;
    fontStyle: MusicXML.NormalItalic;
    fontSize: string;

    /*---- MusicXML.PrintStyle >> Color -----------------------------------------------------*/

    get color(): string {
        let hex = this._color.toString(16);
        return "#" + "000000".substr(0, 6 - hex.length) + hex;
    }
    set color(a: string) {
        switch(true) {
            case !a:
                this._color = 0;
                break;
            case a[0] === "#":
                a = a.slice(1);
                this._color = parseInt(a, 16);
                break;
            default:
                this._color = parseInt(a, 16);
                break;
        }
    }

    private _color: number = 0x000000;

    /*---- II. Life-cycle -----------------------------------------------------------------------*/

    constructor(spec: MusicXML.FiguredBass) {
        _.forEach(spec, (value, key) => {
            (<any>this)[key] = value;
        });
    }

    toXML(): string {
        return MusicXML.serialize.figuredBass(this);
    }

    inspect() {
        return this.toXML();
    }
}

FiguredBassModel.prototype.divCount = 0;
FiguredBassModel.prototype.frozenness = IModel.FrozenLevel.Warm;

module FiguredBassModel {
    export class Layout implements Export.ILayout {
        constructor(model: FiguredBassModel, cursor$: ICursor) {
            this.model = model;
            this.x$ = cursor$.x$;
            this.division = cursor$.division$;
        }

        /*---- ILayout ------------------------------------------------------*/

        // Constructed:

        model: FiguredBassModel;
        x$: number;
        division: number;

        // Prototype:

        mergePolicy: IModel.HMergePolicy;
        boundingBoxes$: IModel.IBoundingRect[];
        renderClass: IModel.Type;
        expandPolicy: IModel.ExpandPolicy;
    }

    Layout.prototype.mergePolicy = IModel.HMergePolicy.Min;
    Layout.prototype.expandPolicy = IModel.ExpandPolicy.None;
    Layout.prototype.renderClass = IModel.Type.FiguredBass;
    Layout.prototype.boundingBoxes$ = [];
    Object.freeze(Layout.prototype.boundingBoxes$);
};

/**
 * Registers FiguredBass in the factory structure passed in.
 */
function Export(constructors: { [key: number]: any }) {
    constructors[IModel.Type.FiguredBass] = FiguredBassModel;
}

module Export {
    export interface IFiguredBassModel extends IModel, MusicXML.FiguredBass {
    }

    export interface ILayout extends IModel.ILayout {
    }
}

export default Export;
