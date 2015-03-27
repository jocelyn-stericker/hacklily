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
import Clef             = require("./clef");
import KeySignature     = require("./keySignature");
import TimeSignature    = require("./timeSignature");

class AttributesView extends React.Component<{layout: Attributes.ILayout}, void> {
    render(): any {
        let layout = this.props.layout;
        let children: any[] = [];
        let dx$ = 0;
        if (layout.clefVisible) {
            let clef = Object.create(layout.model.clefs[layout.staffIdx]);
            clef.defaultX = layout.x$;
            clef.relativeX = 0;
            clef.defaultY = layout.y$;
            clef.relativeY = 0;
            children.push($(Clef)({
                spec: clef,
                key: "clef"
            }));

            dx$ += layout.clefSpacing;
        }
        if (layout.ksVisible) {
            let ks = Object.create(layout.model.keySignatures[0]);
            ks.defaultX = layout.x$ + dx$;
            ks.relativeX = 0;
            ks.defaultY = layout.y$;
            ks.relativeY = 0;
            children.push($(KeySignature)({
                spec: ks,
                clef: layout.model.clefs[layout.staffIdx],
                key: "ks"
            }));

            dx$ += layout.ksSpacing;
        }
        if (layout.tsVisible) {
            let ts = Object.create(layout.model.times[0]);
            ts.defaultX = layout.x$ + dx$;
            ts.relativeX = 0;
            ts.defaultY = layout.y$;
            ts.relativeY = 0;
            children.push($(TimeSignature)({
                spec: ts,
                key: "ts"
            }));
        }
        console.log(layout.x$, layout.y$, layout.staffIdx, layout.clefVisible, layout.tsVisible, layout.ksVisible);
        return React.DOM.g(null, children);
    }
}

export = AttributesView;
