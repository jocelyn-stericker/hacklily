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

import {createFactory as $, Component, DOM} from "react";
import invariant = require("react/lib/invariant");

import Attributes from "../models/attributes";
import BarNumber from "./barNumber";
import Clef from "./clef";
import PartSymbol from "./partSymbol";
import KeySignature from "./keySignature";
import TimeSignature from "./timeSignature";
import StaffLines from "./staffLines";

class AttributesView extends Component<{layout: Attributes.ILayout}, void> {
    render(): any {
        let layout = this.props.layout;
        let children: any[] = [];

        // Staff lines go first, because they are underneath other attributes
        let staffWidth = (<any>layout).staffWidth;
        let staffLinesOffsetX = (<any>layout).staffLinesOffsetX;
        if (!!staffWidth) {
            invariant(layout.staffIdx in layout.model.staffDetails, "Staff details must be defined");
            children.push($(StaffLines)({
                key: "staffLines",
                width: staffWidth,
                defaultX: -staffLinesOffsetX,
                defaultY: 0,
                staffDetails: layout.model.staffDetails[layout.staffIdx]
            }));
        }

        if (layout.clefVisible) {
            children.push($(Clef)({
                key: "clef",
                spec: layout.model.clefs[layout.staffIdx]
            }));
        }
        if (layout.ksVisible) {
            children.push($(KeySignature)({
                clef: layout.model.clefs[layout.staffIdx],
                key: "ks",
                spec: layout.model.keySignatures[0]
            }));
        }
        if (layout.tsVisible) {
            children.push($(TimeSignature)({
                key: "ts",
                spec: layout.model.times[0]
            }));
        }
        if (!!layout.measureNumberVisible) {
            children.push($(BarNumber)({
                barNumber: layout.measureNumberVisible,
                key: "measure",
                spec: {
                    defaultX: 0,
                    defaultY: 30
                }
            }));
        }
        if (!!layout.partSymbolVisible) {
            children.push($(PartSymbol)({
                key: "partSymbol",
                spec: layout.model.partSymbol
            }));
        }

        return DOM.g(null, children);
    }
}

export default AttributesView;
