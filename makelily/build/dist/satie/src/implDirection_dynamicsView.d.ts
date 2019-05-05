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
import { Dynamics, Direction } from "musicxml-interfaces";
import { ReactElement, Component } from "react";
import * as PropTypes from "prop-types";
export interface IProps {
    layout: {
        model: Direction;
        overrideX?: number;
    };
    key?: string | number;
}
export default class DynamicsView extends Component<IProps, {}> {
    static contextTypes: {
        originY: PropTypes.Requireable<number>;
    };
    context: {
        originY: number;
    };
    render(): ReactElement<any>;
    getGlyphName(dynamics: Dynamics): "dynamicFF" | "dynamicFFF" | "dynamicFFFF" | "dynamicFFFFF" | "dynamicFFFFFF" | "dynamicForte" | "dynamicFortePiano" | "dynamicForzando" | "dynamicMF" | "dynamicMP" | "dynamicPP" | "dynamicPPP" | "dynamicPPPP" | "dynamicPPPPP" | "dynamicPPPPPP" | "dynamicPiano" | "dynamicRinforzando1" | "dynamicRinforzando2" | "dynamicSforzando1" | "dynamicSforzandoPianissimo" | "dynamicSforzandoPiano" | "dynamicSforzato" | "dynamicSforzatoFF";
}
