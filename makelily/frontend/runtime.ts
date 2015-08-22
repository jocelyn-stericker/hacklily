/** 
 * (C) Josh Netterfield <joshua@nettek.ca> 2015.
 * Part of the Dragon MIDI/audio library <https://github.com/ripieno/dragon>.
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

import {defer} from "lodash";

import {ITransientMsg, IEngineState, IDragonBackend} from "../backends/spec";

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
 * @param backend the service to use
 * @param cb.transientMsg remote(ITransientMsg)
 * @param cb.engineState remote(IEngineState)
 */
export function run(backend: IDragonBackend, cb: (transientMsg: ITransientMsg, engineState: IEngineState) => void) {
    backend.run(function runWrapper(transientMsg: ITransientMsg, engineState: IEngineState) {
        // this could have happened from within a sync atom get (yikes.)
        defer(function() {
            if (transientMsg && transientMsg.toId) {
                if (transientMsg.error) {
                    throw new Error("ITransient messages to effects must not be errors");
                }
                if (_effectCbs[transientMsg.toId]) {
                    _effectCbs[transientMsg.toId](transientMsg.msg);
                }
            } else {
                cb(transientMsg, engineState);
            }
        });
    });
}
