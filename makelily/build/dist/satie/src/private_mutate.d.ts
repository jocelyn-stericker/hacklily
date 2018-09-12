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
import { IAny, IObjectReplace, IObjectDelete, IObjectInsert, IListReplace, IListDelete, IListInsert, OTPath } from "musicxml-interfaces/operations";
export declare function parentExists(obj: any, p: OTPath): boolean;
export declare function findParent(obj: any, p: OTPath): any;
export declare function set(obj: any, op: IObjectInsert<any>): void;
export declare function insertToList(obj: any, op: IListInsert<any>): void;
export declare function replace(obj: any, op: IObjectReplace<any>): void;
export declare function replaceInList(obj: any, op: IListReplace<any>): void;
export declare function remove(obj: any, op: IObjectDelete<any>): void;
export declare function removeFromList(obj: any, op: IListDelete<any>): void;
export declare function mutate(obj: any, op: IAny): void;
