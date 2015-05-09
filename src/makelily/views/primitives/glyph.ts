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
import invariant        = require("react/lib/invariant");

import SMuFL            = require("../../models/smufl");

/**
 * Most musical elements are rendered as glyphs. Exceptions include
 * slurs, ties, dots in dotted notes, ledger lines, and stave lines.
 */
class Glyph extends React.Component<Glyph.IProps, void> {
    render() {
        var px = this.props.x;
        var py = this.props.y;

        if (this.props.glyphName.substr(0, 2) === "fa") {
            invariant(!!this.props.code, "Undefined glyph.");
            return React.DOM.text({
                x: px,
                y: py,
                fill: this.props.fill,
                fillOpacity: this.props.opacity,
                strokeOpacity: this.props.opacity,
                transform: this.props.transform,
                style: { fontSize: this.props.scale ? this.props.scale + "em" : undefined },
                className: "fa"
            }, this.props.code);
        } else {
            invariant(!this.props.code, "Glyph should be falsy if not displaying an FA glpyh.");
        }

        var text: React.ReactElement<any> = React.DOM.text({
                x: px,
                y: py,
                fill: this.props.fill,
                fillOpacity: this.props.opacity,
                strokeOpacity: this.props.opacity,
                transform: this.props.transform,
                fontSize: 40*(this.props.scale||1),
                className: "mn_"},
            SMuFL.getGlyphCode(this.props.glyphName)
        );

        return text;
    }
}

module Glyph {
    export interface IProps {
        fill: string;
        glyphName: string;
        "selection-info"?: string;
        transform?: string;
        x: number;
        y: number;
        opacity?: number;
        code?: string;
        scale?: number;
    }
}

export = Glyph;
