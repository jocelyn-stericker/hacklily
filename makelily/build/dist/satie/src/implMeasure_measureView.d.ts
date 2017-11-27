/// <reference types="react" />
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
import { IMeasureLayout } from "./private_measureLayout";
export interface IProps {
    layout: IMeasureLayout;
    key?: string | number;
    version: number;
}
export default class MeasureView extends Component<IProps, {}> {
    static childContextTypes: any;
    static contextTypes: any;
    context: {
        originY: number;
    };
    render(): any;
    getChildContext(): {
        originYByPartAndStaff: {
            [x: string]: number[];
        };
        systemBottom: number;
        systemTop: number;
    };
    extractOrigins(layouts: number[]): number[];
    invert(y: number): number;
    shouldComponentUpdate(nextProps: IProps): boolean;
}
