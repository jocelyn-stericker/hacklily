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
import { Barline, PartGroup, PartSymbol } from "musicxml-interfaces";
import { IModel, ILayout } from "./document";
import { IAttributesLayout } from "./implAttributes_attributesModel";
/**
 * Registers Barline in the factory structure passed in.
 */
export default function Export(constructors: {
    [key: number]: any;
}): void;
export interface IBarlineModel extends IModel, Barline {
    divisions: number;
    defaultX: number;
    defaultY: number;
    satieAttributes: IAttributesLayout;
    satieAttribsOffset: number;
}
export interface IBarlineLayout extends ILayout {
    model: IBarlineModel;
    height: number;
    yOffset: number;
    lineStarts: number[];
    lineWidths: number[];
    partSymbol: PartSymbol;
    partGroups: PartGroup[];
}
