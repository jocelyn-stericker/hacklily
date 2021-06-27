/**
 * @source: https://github.com/emilyskidsister/satie/
 *
 * @license
 * (C) Jocelyn Stericker <jocelyn@nettek.ca> 2015.
 * Part of the Satie music engraver <https://github.com/emilyskidsister/satie>.
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
import { Component } from "react";
import { IBeamLayout } from "./implChord_beamLayout";
export interface IProps {
    key?: string | number;
    stroke: string;
    stemWidth: number;
    layout: IBeamLayout;
}
export default class UnbeamedTuplet extends Component<IProps, {}> {
    static contextTypes: any;
    context: {
        originY: number;
    };
    render(): any;
    /**
     * Offset because the note-head has a non-zero width.
     */
    getLineXOffset(): number;
    /**
     *  1 if the notes go up,
     * -1 if the notes go down.
     */
    direction(): 1 | -1;
    private _withXOffset;
    private _getX1;
    private _getX2;
    private _getY1;
    private _getY2;
}
