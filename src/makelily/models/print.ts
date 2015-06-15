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
import invariant = require("react/lib/invariant");

import {defaultsDeep, ICursor, IModel, ISegment} from "../engine";

class PrintModel implements Export.IPrintModel {

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

    once: boolean;
    validate$(cursor$: ICursor): void {
        invariant(!!cursor$.header, "Cursor must have a valid header");
        let spec: MusicXML.Print;
        if (!this.once) {
            // FIXME: should always sync
            let defaultPrint = extractDefaultPrintFromHeader(cursor$.header);
            spec = defaultsDeep(this, defaultPrint);
        } else {
            spec = this;
        }
        this.sync(spec);
        this.measureNumbering = this.measureNumbering || {
            data: "system"
        };
        cursor$.print$                  = this; // FIXME: inheritance for multiple papers
        this.pageNumber = null;

        this.once = true;
    }

    layout(cursor$: ICursor): Export.ILayout {
        cursor$.print$                  = this; // FIXME: inheritance for multiple papers

        return new PrintModel.Layout(this, cursor$);
    }

    sync(print: MusicXML.Print) {
        let keys = Object.keys(Object(print));

        for (let i = 0; i < keys.length; ++i) {
            if (!(<any>this)[keys[i]]) {
                (<any>this)[keys[i]] = (<any>print)[keys[i]];
            }
        }
    }

    /*---- I.2 MusicXML.Print -------------------------------------------------------------------*/

    measureNumbering: MusicXML.MeasureNumbering;
    partNameDisplay: MusicXML.PartNameDisplay;
    newSystem: boolean;
    newPage: boolean;
    blankPage: string;
    measureLayout: MusicXML.MeasureLayout;
    partAbbreviationDisplay: MusicXML.PartAbbreviationDisplay;
    pageLayout: MusicXML.PageLayout;
    systemLayout: MusicXML.SystemLayout;
    /**
     * DEPRECATED. Use staffLayouts
     */
    staffSpacing: number;
    staffLayouts: MusicXML.StaffLayout[];
    pageNumber: string;

    /*---- II. Life-cycle -----------------------------------------------------------------------*/

    constructor(spec: MusicXML.Print) {
        _.forEach(spec, (value, key) => {
            (<any>this)[key] = value;
        });
    }

    toXML(): string {
        return MusicXML.serialize.print(this);
    }

    inspect() {
        return this.toXML();
    }

    /*---- III. Extensions ----------------------------------------------------------------------*/

    pageMarginsFor(page: number): MusicXML.PageMargins {
        for (let i = 0; i < this.pageLayout.pageMargins.length; ++i) {
            let margins = this.pageLayout.pageMargins[i];
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
PrintModel.prototype.frozenness = IModel.FrozenLevel.Warm;

module PrintModel {
    export class Layout implements Export.ILayout {
        constructor(origModel: PrintModel, cursor$: ICursor) {
            let model = Object.create(origModel);
            this.model = model;
            model.pageNumber = "" + cursor$.page$;
            this.x$ = cursor$.x$;
            this.division = cursor$.division$;

            if (model.pageNumber === "1" && cursor$.measure.idx === 0) {
                model.systemLayout = {
                    systemMargins: {
                        leftMargin: 70,
                        rightMargin: 0
                    }
                };
                // Doesn't work because the layout model isn't read.
            }

            // FIXME/STOPSHIP: get the layout version of print in view.ts
            origModel.pageNumber = model.pageNumber;
        }

        /*---- ILayout ------------------------------------------------------*/

        // Constructed:

        model: PrintModel;
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
    Layout.prototype.renderClass = IModel.Type.Print;
    Layout.prototype.boundingBoxes$ = [];
    Object.freeze(Layout.prototype.boundingBoxes$);
};

function extractDefaultPrintFromHeader(header: MusicXML.ScoreHeader): MusicXML.Print {
    return {
        blankPage: "",
        measureLayout: null,
        measureNumbering: {
            color: "#000000",
            data: "system",
            defaultX: null,
            defaultY: null,
            fontFamily: "Alegreya, serif",
            fontSize: "small",
            fontStyle: MusicXML.NormalItalic.Normal,
            fontWeight: MusicXML.NormalBold.Normal,
            relativeX: 0,
            relativeY: 0
        },
        newPage: false,
        newSystem: false,
        pageLayout: header.defaults.pageLayout,
        pageNumber: "",
        partAbbreviationDisplay: null,
        partNameDisplay: null,
        staffLayouts: header.defaults.staffLayouts,
        staffSpacing: null, // DEPRECATED
        systemLayout: header.defaults.systemLayout
    };
}

/**
 * Registers Print in the factory structure passed in.
 */
function Export(constructors: { [key: number]: any }) {
    constructors[IModel.Type.Print] = PrintModel;
}

module Export {
    export interface IPrintModel extends IModel, MusicXML.Print {
    }

    export interface ILayout extends IModel.ILayout {
    }
}

export default Export;
