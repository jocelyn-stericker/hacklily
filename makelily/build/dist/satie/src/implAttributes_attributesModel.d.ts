/**
 * @source: https://github.com/jnetterf/satie/
 *
 * @license
 * (C) Josh Netterfield <joshua@nettek.ca> 2015.
 * Part of the Satie music engraver <https://github.com/jnetterf/satie>.
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
import { Clef, PartSymbol, StaffDetails, Time, Key, Attributes } from "musicxml-interfaces";
import { IModel, ILayout } from "./document";
import { LayoutCursor } from "./private_cursor";
/**
 * Registers Attributes in the factory structure passed in.
 */
declare function Export(constructors: {
    [key: number]: any;
}): void;
declare module Export {
    interface IAttributesModel extends Attributes, IModel {
        divisions: number;
    }
    interface IAttributesLayout extends ILayout {
        model: IModel;
        clef: Clef;
        snapshotClef: Clef;
        clefSpacing: number;
        time: Time;
        tsSpacing: number;
        keySignature: Key;
        ksSpacing: number;
        measureNumberVisible: string;
        partSymbol: PartSymbol;
        staffIdx: number;
        staffDetails: StaffDetails;
    }
    function createWarningLayout(cursor: LayoutCursor, prevAttributes: Attributes, nextAttributes: Attributes): IAttributesLayout;
}
export default Export;
