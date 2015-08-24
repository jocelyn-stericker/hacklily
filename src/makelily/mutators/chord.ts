/**
 * The Ripieno editor. 
 * (C) Josh Netterfield <joshua@nettek.ca> 2014-2015.
 */
 
import invariant = require("invariant");
import noteMutator from "./note";
 
import {AnyOperation} from "../ot";
import ChordImpl from "../satie/src/models/chord/chordImpl"
 
export default function chordMutator(chord: ChordImpl, op: AnyOperation) {
    let path = op.p;
    console.log(chord, op);
    
    if (op.p[0] === "notes") {
        let note = chord[parseInt(String(op.p[1]), 10)];
        invariant(Boolean(note), `Invalid operation path for chord. No such note ${op.p[1]}`);
        
        let localOp: AnyOperation = JSON.parse(JSON.stringify(op));
        localOp.p = path.slice(2);
        noteMutator(note, localOp);
    } else {
        invariant(false, `Invalid/unimplemented operation path for chord: ${op.p[0]}`);
    }
}