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

import {createFactory, Component, DOM, PropTypes, ReactElement} from "react";

import AttributesExports from "./implAttributes_attributesModel";
import BarNumber from "./implAttributes_barNumberView";
import Clef from "./implAttributes_clefView";
import PartSymbol from "./implAttributes_partSymbolView";
import KeySignature from "./implAttributes_keySignatureView";
import TimeSignature from "./implAttributes_timeSignatureView";
import StaffLines from "./implAttributes_staffLinesView";

const $StaffLines = createFactory(StaffLines);
const $Clef = createFactory(Clef);
const $KeySignature = createFactory(KeySignature);
const $TimeSignature = createFactory(TimeSignature);
const $BarNumber = createFactory(BarNumber);
const $PartSymbol = createFactory(PartSymbol);

export default class AttributesView extends Component<{layout: AttributesExports.IAttributesLayout}, {}> {
    static contextTypes = {
        originY: PropTypes.number.isRequired
    } as any;

    context: {
        originY: number
    };

    render(): ReactElement<any> {
        let layout = this.props.layout;
        let children: any[] = [];

        // Staff lines go first, because they are underneath other attributes
        let staffWidth = (<any>layout).staffWidth;
        let staffLinesOffsetX = (<any>layout).staffLinesOffsetX;
        if (!!staffWidth) {
            children.push($StaffLines({
                key: "staffLines",
                width: staffWidth,
                defaultX: this.props.layout.overrideX - staffLinesOffsetX,
                defaultY: 0,
                staffDetails: layout.staffDetails
            }));
        }

        if (layout.clef) {
            children.push($Clef({
                key: "clef",
                spec: layout.clef
            }));
        }
        if (layout.keySignature) {
            children.push($KeySignature({
                clef: layout.snapshotClef,
                key: "ks",
                spec: layout.keySignature
            }));
        }
        if (layout.time) {
            children.push($TimeSignature({
                key: "ts",
                spec: layout.time
            }));
        }
        if (!!layout.measureNumberVisible) {
            children.push($BarNumber({
                barNumber: layout.measureNumberVisible,
                key: "measure",
                spec: {
                    defaultX: 0,
                    defaultY: 30
                }
            }));
        }
        if (!!layout.partSymbol) {
            children.push($PartSymbol({
                key: "partSymbol",
                spec: layout.partSymbol
            }));
        }

        return DOM.g(null, children);
    }
}
