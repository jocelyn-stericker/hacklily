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

import {IModel, ILayout, Type} from "./document";

import {IReadOnlyValidationCursor, LayoutCursor} from "./private_cursor";
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

    _snapshot: Print;

    /*---- Implementation -----------------------------------------------------------------------*/

    constructor(spec: Print) {
        forEach<any>(spec, (value, key) => {
            (this as any)[key] = value;
        });
    }

    refresh(cursor: IReadOnlyValidationCursor): void {
        invariant(!!cursor.header, "Cursor must have a valid header");
        if (!this.measureNumbering) {
            cursor.patch(staff => staff.print(print =>
                print.measureNumbering({
                    data: "system",
                })
            ));
        }

        if (this.pageNumber !== "1") { // XXX: Make this the actual page number
            cursor.patch(staff => staff.print(print =>
                print.pageNumber("1")
            ));
        }

        if (!this.systemLayout) {
            cursor.patch(staff => staff.print(print =>
                print.systemLayout({})
            ));
        }
        const atStart = this.pageNumber === "1" && cursor.measureInstance.idx === 0;
        if (!this.systemLayout.systemMargins || atStart && !this.systemLayout.systemMargins.leftMargin) {
            cursor.patch(staff => staff.print(print =>
                print.systemLayout(systemLayout =>
                    systemLayout.systemMargins({
                        leftMargin: atStart ? 70 : 0,
                        rightMargin: 0,
                    })
                )
            ));
        }

        let defaultPrint = extractDefaultPrintFromHeader(cursor.header);
        this._snapshot = this.getSnapshot(defaultPrint);
    }

    getLayout(cursor: LayoutCursor): Export.IPrintLayout {
        return new PrintModel.Layout(this, cursor);
    }

    getSnapshot(parent: Print): Print {
        return defaultsDeep({
            measureNumbering: this.measureNumbering,
            partNameDisplay: this.partNameDisplay,
            newSystem: this.newSystem,
            newPage: this.newPage,
            blankPage: this.blankPage,
            measureLayout: this.measureLayout,
            partAbbreviationDisplay: this.partAbbreviationDisplay,
            pageLayout: this.pageLayout,
            systemLayout: this.systemLayout,
            staffSpacing: this.staffSpacing,
            staffLayouts: this.staffLayouts,
            pageNumber: this.pageNumber,
        } as Print, parent) as any;
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

    calcWidth(shortest: number) {
        return 0;
    }
}

PrintModel.prototype.divCount = 0;
PrintModel.prototype.divisions = 0;

module PrintModel {
    export class Layout implements Export.IPrintLayout {
        constructor(model: PrintModel, cursor: LayoutCursor) {
            this.model = model;
            this.x = cursor.segmentX;
            this.division = cursor.segmentDivision;

            this.renderedWidth = 0;
        }

        /*---- ILayout ------------------------------------------------------*/

        // Constructed:

        model: PrintModel;
        x: number;
        division: number;

        renderedWidth: number;

        // Prototype:

        boundingBoxes: IBoundingRect[];
        renderClass: Type;
        expandPolicy: "none";
    }

    Layout.prototype.expandPolicy = "none";
    Layout.prototype.renderClass = Type.Print;
    Layout.prototype.boundingBoxes = [];
    Object.freeze(Layout.prototype.boundingBoxes);
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
