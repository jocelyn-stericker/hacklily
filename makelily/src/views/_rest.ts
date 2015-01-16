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

"use strict";

import React            = require("react");
import TypedReact       = require("typed-react");
import _                = require("lodash");
import PureRenderMixin  = require("react/lib/ReactComponentWithPureRenderMixin");

import C                = require("../stores/contracts");
import _Dot             = require("./_dot");
import _Glyph           = require("./_glyph");
import _NoteNotation    = require("./_noteNotation");

var    Dot              = React.createFactory(_Dot.Component);
var    Glyph            = React.createFactory(_Glyph.Component);

/**
 * Renders a rest.
 */
class Rest extends TypedReact.Component<Rest.IProps, {}> {
    render() {
        var line = this.props.line[0];
        var bbox = C.SMuFL.bravuraBBoxes[this.props.notehead];
        var width = (bbox[0] - bbox[2])*10;
        var spacing = this.props.spacing;
        return React.DOM.g(null,
            Glyph({
                key: "R",
                x: this.props.x + spacing,
                y: this.props.y + (3 - line)*10,
                fill: this.props.stroke,
                glyphName: this.props.notehead}
            /* Glyph */),
            this.props.multiRest && React.DOM.text({
                    x: this.props.x + spacing + width/2,
                    y: this.props.y - 30,
                    fontSize: 48,
                    className: "mmn_",
                    textAnchor: "middle",
                    line: line},
                this.props.multiRest
            /* React.DOM.text */),
            this.props.dotted ? _.times(this.props.dotted, idx => Dot({
                idx: idx,
                key: idx + "d",
                radius: 2.4,
                stroke: this.props.stroke,
                x: this.props.x + spacing + this.props.dotOffset,
                y: this.props.y,
                line: line}
            /* Dot */)): null,
            this.props.children && _.map(this.props.children, (element, idx) => {
                element.props.direction = this.direction();
                element.props.line = this.startingLine();
                element.props.x = this.props.x;
                element.props.y = this.props.y;
                element.props.idx = idx;
                element.props.notehead = this.props.notehead;
                return element;
            })
        /* React.DOM.g */);
    }

    direction() {
        return 1;
    }

    startingLine() {
        // TODO: stub
        return this.props.line[0];
    }
}

module Rest {
    export var Component = TypedReact.createClass(Rest, <any> [PureRenderMixin]);

    export interface IProps {
        children?: _NoteNotation[];
        dotted: number;
        dotOffset?: number;
        line: Array<number>;
        multiRest?: number;
        notehead: string;
        spacing: number;
        stroke: string;
        x: number;
        y: number;
    }
}

export = Rest;
