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

class HarmonyModel implements Export.IHarmonyModel {

    /*---- I.1 IModel ---------------------------------------------------------------------------*/

    /** @prototype only */
    divCount:        number;

    /** defined externally */
    staffIdx:        number;

    /** @prototype */
    frozenness:      Engine.IModel.FrozenLevel;

    get fields() {
        return [
            "frame",
            "printFrame",
            "staff",
            "type",
            "offset",
            "root",
            "function",
            "kind",
            "degrees",
            "inversion",
            "bass",
            "footnote",
            "level",
            "printObject",
            "defaultX",
            "relativeY",
            "defaultY",
            "relativeX",
            "fontFamily",
            "fontWeight",
            "fontStyle",
            "fontSize",
            "color",
            "placement"
        ];
    }

    modelDidLoad$(segment$: Engine.Measure.ISegment): void {
        // todo
    }

    validate$(cursor$: Engine.ICursor): void {
        // todo
    }

    layout(cursor$: Engine.ICursor): Export.ILayout {
        // todo

        return new HarmonyModel.Layout(this, cursor$);
    }

    /*---- I.2 MusicXML.Harmony -----------------------------------------------------------------*/

    frame:              MusicXML.Frame;
    printFrame:         boolean;
    staff:              number;
    type:               MusicXML.ExplicitImpliedAlternate;
    offset:             MusicXML.Offset;

    /*---- I.2.1 MusicXML.HarmonyChord ----------------------------------------------------------*/

    root:               MusicXML.Root;
    function:           MusicXML.Function;
    kind:               MusicXML.Kind;
    degrees:            MusicXML.Degree[];
    inversion:          MusicXML.Inversion;
    bass:               MusicXML.Bass;

    /*---- I.2.2 MusicXML.Editorial -------------------------------------------------------------*/

    footnote:           MusicXML.Footnote;
    level:              MusicXML.Level;

    /*---- I.2.3 MusicXML.PrintObject -----------------------------------------------------------*/

    printObject:        boolean;

    /*---- I.2.4 MusicXML.PrintStyle ------------------------------------------------------------*/

    /*---- MusicXML.PrintStyle >> Position --------------------------------------------------*/

    defaultX:           number; // ignored for now
    relativeY:          number;
    defaultY:           number;
    relativeX:          number;

    /*---- MusicXML.PrintStyle >> Font ------------------------------------------------------*/

    fontFamily:         string;
    fontWeight:         MusicXML.NormalBold;
    fontStyle:          MusicXML.NormalItalic;
    fontSize:           string;

    /*---- MusicXML.PrintStyle >> Color -----------------------------------------------------*/

    get color(): string {
        var hex = this._color.toString(16);
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

    private _color:     number = 0x000000;

    /*---- I.2.5 MusicXML.Placement -------------------------------------------------------------*/

    placement:          MusicXML.AboveBelow;

    /*---- II. Life-cycle -----------------------------------------------------------------------*/

    constructor(spec: MusicXML.Harmony) {
        _.forEach(spec, (value, key) => {
            (<any>this)[key] = value;
        });
    }

    toXML(): string {
        return MusicXML.harmonyToXML(this);
    }

    inspect() {
        return this.toXML();
    }
}

HarmonyModel.prototype.divCount = 0;
HarmonyModel.prototype.frozenness = Engine.IModel.FrozenLevel.Warm;

module HarmonyModel {
    export class Layout implements Export.ILayout {
        constructor(model: HarmonyModel, cursor$: Engine.ICursor) {
            this.model = model;
            this.x$ = cursor$.x$;
            this.division = cursor$.division$;
        }

        /*---- ILayout ------------------------------------------------------*/

        // Constructed:

        model: HarmonyModel;
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
    Layout.prototype.priority = Engine.IModel.Type.Harmony;
    Layout.prototype.boundingBoxes$ = [];
    Object.freeze(Layout.prototype.boundingBoxes$);
};

function deepAssign<T>(a: T, b: T):T {
    if (a instanceof Array || b instanceof Array) {
        var retArr: any[] = [];
        var aArr:   any[] = (<any>a);
        var bArr:   any[] = (<any>b);
        for (var i = 0; i < Math.max(a ? aArr.length : 0, b ? bArr.length : 0); ++i) {
            retArr.push(deepAssign(a ? aArr[i] : null, b ? bArr[i] : null));
        }
        return (<any>retArr);
    } else if (a instanceof Object || b instanceof Object) {
        var ret: T = a ? Engine.Util.cloneObject(a) : (<T>{});
        for (var key in b) {
            if (b.hasOwnProperty(key)) {
                (<any>ret)[key] = deepAssign((<any>ret)[key], (<any>b)[key]);
            }
        }
        return ret;
    } else {
        return (a === undefined) ? b : a;
    }
}

/**
 * Registers Harmony in the factory structure passed in.
 */
function Export(constructors: { [key: number]: any }) {
    constructors[Engine.IModel.Type.Harmony] = HarmonyModel;
}

module Export {
    export interface IHarmonyModel extends Engine.IModel, MusicXML.Harmony {
    }

    export interface ILayout extends Engine.IModel.ILayout {
    }
}

export = Export;
