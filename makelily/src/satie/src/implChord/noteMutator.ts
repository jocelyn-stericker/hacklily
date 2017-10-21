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

import * as invariant from "invariant";
import {IAny, IObjectReplace, IObjectDelete, IObjectInsert} from "musicxml-interfaces/operations";

import ILinesLayoutState from "../private/linesLayoutState";
import {replace, remove, set, mutate} from "../private/mutate";

import NoteImpl from "./noteImpl";

export default function noteMutator(memo$: ILinesLayoutState, note: NoteImpl, op: IAny) {
    if (op.p.length > 2) {
        mutate(note, op);
        return;
    }

    if ("od" in op && "oi" in op) {
        if (op.p.length === 2 && op.p[0] === "noteType" && op.p[1] === "duration") {
            note.noteType = {
                duration: op.oi,
            };
        } else {
            replace(note, op as IObjectReplace<any>);
        }
    } else if ("od" in op) {
        remove(note, op as IObjectDelete<any>);
    } else if ("oi" in op) {
        invariant(!(note as any)[op.p[0]], "Object already set");
        set(note, op as IObjectInsert<any>);
    } else {
        invariant(false, "Unknown operation");
    }
}
