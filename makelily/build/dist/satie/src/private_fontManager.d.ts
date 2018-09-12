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
/// <reference path="../../../../src/satie/src/opentypedist.d.ts" />
export declare function requireFont(name: string, url: string, style?: string, full?: boolean): void;
export declare function setRoot(root: string): void;
export declare function markPreloaded(name: string, style?: string): void;
export declare function whenReady(cb: (err?: Error) => void): void;
export declare function getTextBB(name: string, text: string, fontSize: number, style?: string): {
    bottom: number;
    left: number;
    right: number;
    top: number;
};
export declare function toPathData(name: string, text: string, x: number, y: number, fontSize: number, style?: string): string;
