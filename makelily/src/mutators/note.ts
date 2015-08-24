/**
 * The Ripieno editor. 
 * (C) Josh Netterfield <joshua@nettek.ca> 2014-2015.
 */
 
import invariant = require("invariant");
 
import {AnyOperation, IOTObjectReplace} from "../ot";
import NoteImpl from "../satie/src/models/chord/noteImpl"
import {replace} from "./mutate";
 
export default function noteMutator(note: NoteImpl, op: AnyOperation) {
    let path = op.p;
    if ("od" in op && "oi" in op) {
        replace(note, op as IOTObjectReplace<any>);
    }
}