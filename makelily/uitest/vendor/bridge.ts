
/*---- Local ------------------------------------------------------------------------------------*/

import __Dragon = require("../../source/terabithia/bridge");
import __remote = require("remote");
import {TransientMsg, EngineState, MidiDevice, Effect, Connection} from "../../source/terabithia/bridge";
export {TransientMsg, EngineState, MidiDevice, Effect, Connection};

let _effectCbs: {[key: number]: (msg: any) => void} = {};

export function register(id: number, cb: (msg: any) => void) {
    _effectCbs[id] = cb;
}

export function unregister(id: number) {
    delete _effectCbs[id];
}

/**
 * Start the MIDI/Audio server and start receiving callbacks.
 * 
 * @param cb.transientMsg remote(TransientMsg)
 * @param cb.engineState remote(EngineState)
 */
export function run(cb: (transientMsg: TransientMsg, engineState: EngineState) => void) {
    __run(function runWrapper(transientMsg: TransientMsg, engineState: EngineState) {
        if (transientMsg && transientMsg.toId) {
            console.assert(!transientMsg.error, "Transient messages to effects must not be errors");
            if (_effectCbs[transientMsg.toId]) {
                _effectCbs[transientMsg.toId](transientMsg.msg)
            }
        } else {
            cb(transientMsg, engineState);
        }
    });
}

/*---- Remote -----------------------------------------------------------------------------------*/

var remote: typeof __remote = (window as any).require("remote");
var Dragon: typeof __Dragon = remote.require("../build/Release/bridge");
var {run: __run} = Dragon;
export let {Lifecycle, connect, disconnect, create, destroy, toEffect, startStreaming, stop} = Dragon;
