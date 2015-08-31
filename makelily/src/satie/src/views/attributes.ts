/** 
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

import {createFactory as $, Component, DOM, PropTypes} from "react";

import Attributes from "../models/attributes";
import BarNumber from "./barNumber";
import Clef from "./clef";
import PartSymbol from "./partSymbol";
import KeySignature from "./keySignature";
import TimeSignature from "./timeSignature";
import StaffLines from "./staffLines";
import {Targetable} from "./metadata";

@Targetable()
class AttributesView extends Component<{layout: Attributes.ILayout}, {}> {
    render() {
        let layout = this.props.layout;
        let children: any[] = [];

        // Staff lines go first, because they are underneath other attributes
        let staffWidth = (<any>layout).staffWidth;
        let staffLinesOffsetX = (<any>layout).staffLinesOffsetX;
        if (!!staffWidth) {
            children.push($(StaffLines)({
                key: "staffLines",
                width: staffWidth,
                defaultX: -staffLinesOffsetX,
                defaultY: 0,
                staffDetails: layout.staffDetails
            }));
        }

        if (layout.clef) {
            children.push($(Clef)({
                key: "clef",
                spec: layout.clef
            }));
        }
        if (layout.keySignature) {
            children.push($(KeySignature)({
                clef: layout.snapshotClef,
                key: "ks",
                spec: layout.keySignature
            }));
        }
        if (layout.time) {
            children.push($(TimeSignature)({
                key: "ts",
                spec: layout.time
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
        if (!!layout.partSymbol) {
            children.push($(PartSymbol)({
                key: "partSymbol",
                spec: layout.partSymbol
            }));
        }

        return DOM.g(null, children);
    }
}

module AttributesView {
    export let contextTypes = <any> {
        originX: PropTypes.number.isRequired,
        originY: PropTypes.number.isRequired
    };
}

export default AttributesView;
