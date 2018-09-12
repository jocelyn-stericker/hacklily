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
import { Component } from "react";
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
export default class Glyph extends Component<IProps, {}> {
    static contextTypes: any;
    context: {
        renderTarget?: "svg-web" | "svg-export";
    };
    render(): JSX.Element;
}
