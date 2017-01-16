/**
 * This file is part of Satie music engraver <https://github.com/jnetterf/satie>.
 * Copyright (C) Joshua Netterfield <joshua.ca> 2015 - present.
 * 
 * Satie is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 * 
 * Satie is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 * 
 * You should have received a copy of the GNU Affero General Public License
 * along with Satie.  If not, see <http://www.gnu.org/licenses/>.
 */

import {ScoreHeader, MeasureNumbering, PartNameDisplay, MeasureLayout, PartAbbreviationDisplay,
    PageLayout, SystemLayout, StaffLayout, Print, NormalItalic, NormalBold, serializePrint}
    from "musicxml-interfaces";
import {forEach, defaultsDeep} from "lodash";
import * as invariant from "invariant";

import {IModel, ILayout} from "./document_model";
import Type from "./document_types";

import {ICursor} from "./private_cursor";
import {IBoundingRect} from "./private_boundingRect";

class PrintModel implements Export.IPrintModel {
    _class = "Print";

    /*---- I.1 IModel ---------------------------------------------------------------------------*/

    /** @prototype only */
    divCount: number;

    /** @prototype only */
    divisions: number;

    /** defined externally */
    staffIdx: number;

    /*---- I.2 Print ----------------------------------------------------------------------------*/

    measureNumbering: MeasureNumbering;
    partNameDisplay: PartNameDisplay;
    newSystem: boolean;
    newPage: boolean;
    blankPage: string;
    measureLayout: MeasureLayout;
    partAbbreviationDisplay: PartAbbreviationDisplay;
    pageLayout: PageLayout;
    systemLayout: SystemLayout;
    /**
     * DEPRECATED. Use staffLayouts
     */
    staffSpacing: number;
    staffLayouts: StaffLayout[];
    pageNumber: string;

    /*---- Private ------------------------------------------------------------------------------*/

    private _once: boolean;

    /*---- Implementation -----------------------------------------------------------------------*/

    constructor(spec: Print) {
        forEach<any>(spec, (value, key) => {
            (this as any)[key] = value;
        });
    }

    validate(cursor$: ICursor): void {
        invariant(!!cursor$.header, "Cursor must have a valid header");
        let spec: Print;
        if (!this._once) {
            // FIXME: should always sync
            let defaultPrint = extractDefaultPrintFromHeader(cursor$.header);
            spec = defaultsDeep<PrintModel, PrintModel>(this, defaultPrint);
        } else {
            spec = this;
        }
        this.sync(spec);
        this.measureNumbering = this.measureNumbering || {
            data: "system"
        };
        if (!cursor$.print$) {
            cursor$.print$ = this; // FIXME: inheritance for multiple papers
        }
        this.pageNumber = "1"; // TODO

        this._once = true;
    }

    getLayout(cursor$: ICursor): Export.IPrintLayout {
        cursor$.print$ = this; // FIXME: inheritance for multiple papers

        return new PrintModel.Layout(this, cursor$);
    }

    sync(print: Print) {
        let keys = Object.keys(Object(print));

        for (let i = 0; i < keys.length; ++i) {
            if (!(<any>this)[keys[i]]) {
                (<any>this)[keys[i]] = (<any>print)[keys[i]];
            }
        }
    }

    toXML(): string {
        return `${serializePrint(this)}\n<forward><duration>${this.divCount}</duration></forward>\n`;
    }

    toJSON(): any {
        let {
            _class,
            measureNumbering,
            partNameDisplay,
            newSystem,
            newPage,
            blankPage,
            measureLayout,
            partAbbreviationDisplay,
            pageLayout,
            systemLayout,
            staffSpacing,
            staffLayouts,
            pageNumber,
        } = this;

        return {
            _class,
            measureNumbering,
            partNameDisplay,
            newSystem,
            newPage,
            blankPage,
            measureLayout,
            partAbbreviationDisplay,
            pageLayout,
            systemLayout,
            staffSpacing,
            staffLayouts,
            pageNumber,
        };
    }

    inspect() {
        return this.toXML();
    }
}

PrintModel.prototype.divCount = 0;
PrintModel.prototype.divisions = 0;

module PrintModel {
    export class Layout implements Export.IPrintLayout {
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
            this.renderedWidth = 0;
        }

        /*---- ILayout ------------------------------------------------------*/

        // Constructed:

        model: PrintModel;
        x$: number;
        division: number;

        renderedWidth: number;

        // Prototype:

        boundingBoxes$: IBoundingRect[];
        renderClass: Type;
        expandPolicy: "none";
    }

    Layout.prototype.expandPolicy = "none";
    Layout.prototype.renderClass = Type.Print;
    Layout.prototype.boundingBoxes$ = [];
    Object.freeze(Layout.prototype.boundingBoxes$);
};

function extractDefaultPrintFromHeader(header: ScoreHeader): Print {
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
            fontStyle: NormalItalic.Normal,
            fontWeight: NormalBold.Normal,
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
    constructors[Type.Print] = PrintModel;
}

module Export {
    export interface IPrintModel extends IModel, Print {
    }

    export interface IPrintLayout extends ILayout {
        renderedWidth: number;
    }
}

export default Export;
