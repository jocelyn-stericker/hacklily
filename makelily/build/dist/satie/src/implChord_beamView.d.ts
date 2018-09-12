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
import { IBeamLayout } from "./implChord_beamLayout";
export interface IProps {
    key?: string | number;
    layout: IBeamLayout;
    stemWidth: number;
    stroke: string;
}
/**
 * Renders a beam based on a computed layout.
 */
export default class Beam extends Component<IProps, {}> {
    static contextTypes: any;
    context: {
        originY: number;
    };
    render(): ReactElement<any>;
    /**
     * Offset because the note-head has a non-zero width.
     */
    getLineXOffset(): number;
    private _withXOffset;
    private _getX1;
    private _getX2;
    private _getY1;
    private _getY2;
    private _getYVar;
    /**
     * Offset because the note-head has a non-zero height.
     * The note-head is NOT CENTERED at its local origin.
     */
    private _getYOffset;
}
