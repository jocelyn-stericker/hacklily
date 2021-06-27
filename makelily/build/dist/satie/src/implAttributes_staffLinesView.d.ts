/**
 * This file is part of Satie music engraver <https://github.com/emilyskidsister/satie>.
 * Copyright (C) Jocelyn Stericker <jocelyn@nettek.ca> 2015 - present.
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
import { StaffDetails } from "musicxml-interfaces";
import { Component } from "react";
export interface IProps {
    key?: string | number;
    width: number;
    staffDetails: StaffDetails;
    defaultX: number;
    defaultY: number;
}
/**
 * Renders the (usually 5) lines that make up a staff.
 */
export default class StaffLines extends Component<IProps, {}> {
    static contextTypes: any;
    context: {
        originY: number;
    };
    render(): any;
}
