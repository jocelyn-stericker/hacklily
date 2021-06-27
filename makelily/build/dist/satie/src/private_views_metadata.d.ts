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
import { Component, ComponentLifecycle } from "react";
import { ILayout } from "./document";
export interface IBaseProps {
    layout: ILayout;
    originX: number;
}
export interface IMetaComponent<P, S> extends Component<P, S>, ComponentLifecycle<P, S> {
    context: {
        originYByPartAndStaff: {
            [key: string]: number[];
        };
    };
    _record?: IRecord;
}
export interface ILookup {
    x: number;
    y: number;
}
export interface IRecord {
    key: string;
    obj: any;
    x1: number;
    x2: number;
    y1: number;
    y2: number;
    originY: number;
}
/**
 * A decorator that records the position of a component.
 */
export declare function Targetable<P extends IBaseProps, S>(): (component: {
    prototype: IMetaComponent<P, S>;
}) => void;
export declare function get(lookup: ILookup): IRecord;
