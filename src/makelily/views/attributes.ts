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

import React            = require("react");
var $                   = React.createFactory;

import Attributes       = require("../models/attributes");
import BarNumber        = require("./barNumber");
import Clef             = require("./clef");
import PartSymbol       = require("./partSymbol");
import KeySignature     = require("./keySignature");
import TimeSignature    = require("./timeSignature");

class AttributesView extends React.Component<{layout: Attributes.ILayout}, void> {
    render(): any {
        let layout = this.props.layout;
        let children: any[] = [];
        if (layout.clefVisible) {
            children.push($(Clef)({
                spec: layout.model.clefs[layout.staffIdx],
                key: "clef"
            }));
        }
        if (layout.ksVisible) {
            children.push($(KeySignature)({
                spec: layout.model.keySignatures[0],
                clef: layout.model.clefs[layout.staffIdx],
                key: "ks"
            }));
        }
        if (layout.tsVisible) {
            children.push($(TimeSignature)({
                spec: layout.model.times[0],
                key: "ts"
            }));
        }
        if (!!layout.measureNumberVisible) {
            children.push($(BarNumber)({
                spec: {
                    defaultX: 0,
                    defaultY: 30
                },
                key: "measure",
                barNumber: layout.measureNumberVisible
            }));
        }
        if (!!layout.partSymbolVisible) {
            children.push($(PartSymbol)({
                key: "partSymbol",
                spec: layout.model.partSymbol
            }));
        }
        return React.DOM.g(null, children);
    }
}

export = AttributesView;
