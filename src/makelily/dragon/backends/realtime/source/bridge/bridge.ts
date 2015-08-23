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

import {Lifecycle, IAudioDevice, IEffect, IEffectSpec, IConnection, IEngineState, ITransientMsg, IDragonBackend} from "./spec";

interface ICPPBridge {
    onStateChange: (cb: (engineState: string /* "IEngineState" */) => void) => void;
    sendCommand: (func: string, options: string) => number;
    poke: () => void;
    quit: () => void;
}

declare function require(name: string): any;
let CPPBridge: ICPPBridge = require("./dragon");
let stateIdx: number = 0;

let runner: (transientMsg: ITransientMsg, engineState: IEngineState) => void = null;
let running: boolean = false;

let startRunning = function(): void {
    CPPBridge.onStateChange((newEngineState: string) => {
        // this runs in the main thread, but has access to render variabled?
        if (!runner) {
            return;
        }
        let parsed: ITransientMsg | IEngineState = JSON.parse(newEngineState);
        let parsedState: IEngineState = parsed as any;
        let transientMsg: ITransientMsg = parsed as any;
        if (transientMsg.transient) {
            setTimeout(function(): void {
                runner(transientMsg, null);
            }, 1);
        } else {
            parsedState.audio.state = Lifecycle[parsedState.audio.state] as any;
            parsedState.midi.state = Lifecycle[parsedState.midi.state] as any;
            parsedState.stateIdx = ++stateIdx;
            // we don't have a good way of querying yet, so this is hardcoded.
            parsedState.factories = [
                {
                    id: "live.effects.sequencer.Sequencer"
                },
                {
                    id: "live.effects.soundfont.Soundfont"
                },
                {
                    id: "live.engine.rtthread.Passthrough"
                },
                {
                    id: "live.effects.midiBridge.MidiBridge"
                }
            ];
            runner(null, parsedState);
        }
    });
    running = true;
};

module IDragon {
    export function run(cb: (newTransientMsg: ITransientMsg, newEngineState: IEngineState) => void): void {
        runner = cb;
        if (!running) {
            startRunning();
        } else {
            setTimeout(function(): void {
                CPPBridge.poke();
            }, 10);
        }
    }

    export function stop(): void {
        CPPBridge.sendCommand("stop", JSON.stringify({}));
    }

    export function startStreaming(audioDeviceIn: IAudioDevice, audioDeviceOut: IAudioDevice): void {
        CPPBridge.sendCommand("stream", JSON.stringify({
            from: audioDeviceIn.name,
            to: audioDeviceOut.name
        }));
    }

    export function connect(connection: IConnection): void {
        CPPBridge.sendCommand("connect", JSON.stringify(connection));
    }

    export function disconnect(connection: IConnection): void {
        CPPBridge.sendCommand("disconnect", JSON.stringify(connection));
    }

    export function create(spec: IEffectSpec): number {
        return CPPBridge.sendCommand("create", JSON.stringify(spec));
    }

    export function destroy(spec: {id: number}): void {
        CPPBridge.sendCommand("destroy", JSON.stringify(spec));
    }

    export function toEffect(effect: IEffect, anything: {}): void {
        CPPBridge.sendCommand("toEffect", JSON.stringify({
            effect: effect.id,
            msg: JSON.stringify(anything)
        }));
    }

    export function quit(): void {
        runner = null;
        startRunning = null;
        CPPBridge.quit();
    }
}

export = IDragon as IDragonBackend;
