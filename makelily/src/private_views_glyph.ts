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

import {Component, DOM, PropTypes, ReactElement} from "react";

import {getGlyphCode} from "./private_smufl";
import {toPathData} from "./private_fontManager";

export interface IProps {
    key?: string | number;
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

/**
 * Most musical elements are rendered as glyphs. Exceptions include
 * slurs, ties, dots in dotted notes, ledger lines, and stave lines.
 */
export default class Glyph extends Component<IProps, void> {
    static contextTypes = {
        renderTarget: PropTypes.oneOf(["svg-web", "svg-export"])
    } as any;

    context: {
        renderTarget?: "svg-web" | "svg-export",
    };

    render() {
        let px = this.props.x;
        let py = this.props.y;

        if (this.context.renderTarget === "svg-export") {
            let pathData = toPathData("Bravura",
                getGlyphCode(this.props.glyphName), px, py, 40 * (this.props.scale || 1));
            return <ReactElement<any>> DOM.path({d: pathData}, null);
        }

        let text: ReactElement<any> = DOM.text({
                className: "mn_",
                fill: this.props.fill,
                fillOpacity: this.props.opacity,
                fontSize: 40 * (this.props.scale || 1),
                strokeOpacity: this.props.opacity,
                transform: this.props.transform,
                x: px,
                y: py
            },
            getGlyphCode(this.props.glyphName)
        );

        return text;
    }
}
