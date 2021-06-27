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
import { IMeasureLayout } from "./private_measureLayout";
import { ILayoutOptions } from "./private_layoutOptions";
import { ILineBounds } from "./private_lineBounds";
/**
 * Respects the minSpaceBefore and minSpaceAfter of elements. minSpaceBefore and minSpaceAfter
 * are used for things like lyrics.
 *
 * @returns new end of line
 */
declare function pad(_options: ILayoutOptions, _bounds: ILineBounds, measures: IMeasureLayout[]): IMeasureLayout[];
export default pad;
