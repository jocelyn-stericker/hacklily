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

import React = require("react");

import SMuFL = require("../../models/smufl");
import Engine = require("../../models/engine");
import FontManager = require("../../models/fontManager");

/**
 * Most musical elements are rendered as glyphs. Exceptions include
 * slurs, ties, dots in dotted notes, ledger lines, and stave lines.
 */
class Glyph extends React.Component<Glyph.IProps, void> {
    render() {
        var px = this.props.x;
        var py = this.props.y;

        if (this.context.renderTarget === Engine.RenderTarget.SvgExport) {
            let pathData = FontManager.toPathData("Bravura",
                SMuFL.getGlyphCode(this.props.glyphName), px, py, 40*(this.props.scale||1));
            return <React.ReactElement<any>> React.DOM.path({d: pathData}, null);
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
    export let contextTypes = <any> {
        renderTarget: React.PropTypes.number
    };

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
