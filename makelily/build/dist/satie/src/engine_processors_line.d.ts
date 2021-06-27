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
import { ILayoutOptions } from "./private_layoutOptions";
import { ILineBounds } from "./private_lineBounds";
import { IMeasureLayout } from "./private_measureLayout";
import { IAttributesSnapshot } from "./private_attributesSnapshot";
export declare function layoutLine(options: ILayoutOptions, bounds: ILineBounds, memo: {
    y: number;
    attributes: {
        [part: string]: IAttributesSnapshot[];
    };
}): IMeasureLayout[];
