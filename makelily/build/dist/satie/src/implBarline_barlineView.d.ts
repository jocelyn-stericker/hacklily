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
import { Component, ReactElement } from "react";
import BarlineModel from "./implBarline_barlineModel";
/**
 * Renders a full-stave-height barline at (x,y).
 * Does not do any interesting calculations.
 */
export default class BarlineView extends Component<{
    layout: BarlineModel.IBarlineLayout;
}, {}> {
    static contextTypes: any;
    context: {
        originY: number;
        systemBottom: number;
        systemTop: number;
    };
    render(): ReactElement<any>;
}
