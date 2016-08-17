/**
 * @source: https://github.com/jnetterf/satie/
 *
 * @license
 * (C) Josh Netterfield <joshua@nettek.ca> 2015.
 * Part of the Satie music engraver <https://github.com/jnetterf/satie>.
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

import {createFactory, Component, DOM, PropTypes, ReactElement} from "react";

import Attributes from "./attributesModel";
import BarNumber from "./barNumberView";
import Clef from "./clefView";
import PartSymbol from "./partSymbolView";
import KeySignature from "./keySignatureView";
import TimeSignature from "./timeSignatureView";
import StaffLines from "./staffLinesView";

const $StaffLines = createFactory(StaffLines);
const $Clef = createFactory(Clef);
const $KeySignature = createFactory(KeySignature);
const $TimeSignature = createFactory(TimeSignature);
const $BarNumber = createFactory(BarNumber);
const $PartSymbol = createFactory(PartSymbol);

export default class AttributesView extends Component<{layout: Attributes.IAttributesLayout}, {}> {
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
