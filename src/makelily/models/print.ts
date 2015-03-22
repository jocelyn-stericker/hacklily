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
import invariant        = require("react/lib/invariant");

import Engine           = require("./engine");

class PrintModel implements Export.IPrintModel {

    /*---- I.1 IModel ---------------------------------------------------------------------------*/

    /** @prototype only */
    divCount:        number;

    /** defined externally */
    staffIdx:        number;

    /** @prototype */
    frozenness:      Engine.IModel.FrozenLevel;

    get fields() {
        return [
            "measureNumbering",
            "partNameDisplay",
            "newSystem",
            "newPage",
            "blankPage",
            "measureLayout",
            "partAbbreviationDisplay",
            "pageLayout",
            "systemLayout",
            "staffSpacing",
            "staffLayouts",
            "pageNumber"
        ];
    }

    modelDidLoad$(segment$: Engine.Measure.ISegment): void {
        // todo
    }

    validate$(cursor$: Engine.ICursor): void {
        invariant(!!cursor$.header, "Cursor must have a valid header");
        var defaultPrint                = extractDefaultPrintFromHeader(cursor$.header);
        var spec                        = deepAssign<MusicXML.Print>(this, defaultPrint);
        this.sync(spec);
        cursor$.print$                  = this; // FIXME: inheritance for multiple papers
    }

    layout(cursor$: Engine.ICursor): Export.ILayout {
        cursor$.print$                  = this; // FIXME: inheritance for multiple papers

        return new PrintModel.Layout(this, cursor$);
    }

    sync(print: MusicXML.Print) {
        var keys = Object.keys(Object(print));

        for (var i = 0; i < keys.length; ++i) {
            if (!(<any>this)[keys[i]]) {
                (<any>this)[keys[i]] = (<any>print)[keys[i]];
            }
        }
    }

    /*---- I.2 MusicXML.Print -------------------------------------------------------------------*/

    measureNumbering:           MusicXML.MeasureNumbering;
    partNameDisplay:            MusicXML.PartNameDisplay;
    newSystem:                  boolean;
    newPage:                    boolean;
    blankPage:                  string;
    measureLayout:              MusicXML.MeasureLayout;
    partAbbreviationDisplay:    MusicXML.PartAbbreviationDisplay;
    pageLayout:                 MusicXML.PageLayout;
    systemLayout:               MusicXML.SystemLayout;
    /**
     * DEPRECATED. Use staffLayouts
     */
    staffSpacing:               number;
    staffLayouts:               MusicXML.StaffLayout[];
    pageNumber:                 string;

    /*---- II. Life-cycle -----------------------------------------------------------------------*/

    constructor(spec: MusicXML.Print) {
        _.forEach(spec, (value, key) => {
            (<any>this)[key] = value;
        });
    }

    toXML(): string {
        return MusicXML.printToXML(this);
    }

    inspect() {
        return this.toXML();
    }

    /*---- III. Extensions ----------------------------------------------------------------------*/
    pageMarginsFor(page: number): MusicXML.PageMargins {
        for (var i = 0; i < this.pageLayout.pageMargins.length; ++i) {
            var margins = this.pageLayout.pageMargins[i];
            if (margins.type === MusicXML.OddEvenBoth.Both ||
                    (margins.type === MusicXML.OddEvenBoth.Odd) === !!(page % 2)) {
                return margins;
            }
        }
        console.warn("No valid page margins for current page...");
        return null;
    }
}

PrintModel.prototype.divCount = 0;
PrintModel.prototype.frozenness = Engine.IModel.FrozenLevel.Warm;

module PrintModel {
    export class Layout implements Export.ILayout {
        constructor(model: PrintModel, cursor$: Engine.ICursor) {
            this.model = model;
            this.x$ = cursor$.x$;
            this.division = cursor$.division$;
        }

        /*---- ILayout ------------------------------------------------------*/

        // Constructed:

        model: PrintModel;
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
    Layout.prototype.priority = Engine.IModel.Type.Print;
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

function extractDefaultPrintFromHeader(header: MusicXML.ScoreHeader): MusicXML.Print {
    return {
        blankPage:                  "",
        measureLayout:              null,
        measureNumbering: {
            relativeX:              0,
            relativeY:              0,
            fontSize:               "small",
            color:                  "#000000",
            data:                   "system",
            defaultX:               null,
            defaultY:               null,
            fontFamily:             "Alegreya, serif",
            fontStyle:              MusicXML.NormalItalic.Normal,
            fontWeight:             MusicXML.NormalBold.Normal
        },
        newPage:                    false,
        newSystem:                  false,
        partAbbreviationDisplay:    null,
        pageLayout:                 header.defaults.pageLayout,
        pageNumber:                 "",
        partNameDisplay:            null,
        staffLayouts:               header.defaults.staffLayouts,
        staffSpacing:               null, // DEPRECATED
        systemLayout:               header.defaults.systemLayout
    };
}

/**
 * Registers Print in the factory structure passed in.
 */
function Export(constructors: { [key: number]: any }) {
    constructors[Engine.IModel.Type.Print] = PrintModel;
}

module Export {
    export interface IPrintModel extends Engine.IModel, MusicXML.Print {
    }

    export interface ILayout extends Engine.IModel.ILayout {
    }
}

export = Export;
