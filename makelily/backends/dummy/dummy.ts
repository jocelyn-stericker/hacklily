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

import {Lifecycle, IAudioDevice, IEffect, IEffectSpec, IConnection, IEngineState, ITransientMsg, IDragonBackend} from "../spec";
import {isEqual, find, findIndex, filter, forEach, some, times} from "lodash";

import Soundfont from "./soundfont";
import MidiBridge from "./midiBridge";
import IMidiEv from "./midiEv";
import Passthrough from "./passthrough";
import ReceiverF from "./receiverF";
import ReceiverM from "./receiverM";

let runner: (transientMsg: ITransientMsg, engineState: IEngineState) => void = null;
let running: boolean = false;
let onStateChange: (newEngineState: string) => void;
let effects: {
        id: number;
        channels: number;
        __metaTestRemainingIn__?: {[key: number]: string[]};
        fromUI: (n: any) => void;
        midiEvent: (e: any) => void;
        audioEvent: (c: number, e: string) => void;
    }[] = [];

let lastID = 0;

let state: IEngineState = {
    audio: {
        devices: null,
        error: null,
        state: Lifecycle.Streaming
    },
    graph: [],
    midi: {
        devices: [],
        error: null,
        state: Lifecycle.Streaming
    },
    store: [
        {
          audioWidth: "Float",
          connectivity: "Output",
          id: ++lastID,
          isHardware: true,
          isMidi: false,
          name: "Dummy Output (left)"
        },
        {
          audioWidth: "Float",
          connectivity: "Output",
          id: ++lastID,
          isHardware: true,
          isMidi: false,
          name: "Dummy Output (right)"
        },
        {
          audioWidth: "FloatHWIN",
          connectivity: "Input",
          id: ++lastID,
          isHardware: true,
          isMidi: false,
          name: "Dummy Input (left)"
        },
        {
          audioWidth: "FloatHWIN",
          connectivity: "Input",
          id: ++lastID,
          isHardware: true,
          isMidi: false,
          name: "Dummy Input (right)"
        },
        {
          audioWidth: "Float",
          connectivity: "Input",
          id: ++lastID,
          isHardware: true,
          isMidi: true,
          name: "Dummy MIDI Input"
        },
        {
          audioWidth: "Float",
          connectivity: "Output",
          id: ++lastID,
          isHardware: true,
          isMidi: true,
          name: "Dummy MIDI Output"
        }
    ],
    stateIdx: 1,
    factories: [
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
    ]
};

forEach(state.store, effect => {
    let channels = 1;
    let id = effect.id;
    let name = effect.name;
    let toUI = (msg: any) => {/* pass */}
    let emitAudio = processAudio.bind(null, id);
    let emitMidi = processMidi.bind(null, id);

    if (effect.connectivity === "Output" && !effect.isMidi) {
        effects[effect.id] = new ReceiverF({channels, id, name, toUI, emitAudio, emitMidi});
    } else if (effect.connectivity === "Output" && effect.isMidi) {
        effects[effect.id] = new ReceiverM({channels, id, name, toUI, emitAudio, emitMidi});
    } else if (effect.connectivity === "Input" && !effect.isMidi) {
        effects[effect.id] = new Passthrough({channels, id, name, toUI, emitAudio, emitMidi});
    } else if (effect.connectivity === "Input" && effect.isMidi) {
        effects[effect.id] = new Passthrough({channels, id, name, toUI, emitAudio, emitMidi});
    } else {
        console.warn("Effect is ", effect);
        throw new Error("Unknown type.");
    }
});

function sendState() {
    ++state.stateIdx;
    if (onStateChange) {
        onStateChange(JSON.stringify(state));
    }
}

let startRunning = function(): void {
    onStateChange = (newEngineState: string) => {
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
            runner(null, parsedState);
        }
    };
    running = true;
};

function processMidi(id: number, midiEvent: IMidiEv) {
    let targets = filter(state.graph, connection => connection.from === id &&
            connection.fromChannel === -1).map(connection => connection.to);
    forEach(targets, target => {
        if (effects[target]) {
            effects[target].midiEvent(midiEvent);
        }
    });
}

function processAudio(id: number, channel: number, description: string) {
    let connections = filter(state.graph, connection => connection.from === id &&
            connection.fromChannel === channel);

    forEach(connections, connection => {
        let target = effects[connection.to];
        if (target) {
            target.__metaTestRemainingIn__[connection.toChannel] =
                target.__metaTestRemainingIn__[connection.toChannel] || [];
            let meta = target.__metaTestRemainingIn__[connection.toChannel];
            meta.push(description);
            let incoming = filter(state.graph, c => c.to === connection.to &&
                c.toChannel === connection.toChannel);

            if (meta.length === incoming.length) {
                let description = meta.length === 1 ? meta[0] : `<${meta.sort().join(", ")}>`;
                effects[target.id].audioEvent(connection.toChannel, description);
            }
        } else {
            console.warn("Invalid target from connection ", connection);
            throw new Error("Invalid target.");
        }
    });
}

module DragonDummy {
    export function run(cb: (newTransientMsg: ITransientMsg, newEngineState: IEngineState) => void): void {
        runner = cb;
        if (!running) {
            startRunning();
        }

        sendState();
    }

    export function stop(): void {
        // pass
    }

    export function startStreaming(audioDeviceIn: IAudioDevice, audioDeviceOut: IAudioDevice): void {
        throw new Error("Invalid call to startStreaming: the dummy implemention is always streaming.");
    }

    export function connect(connection: IConnection): void {
        state.graph.push(connection);
        sendState();
    }

    export function disconnect(connection: IConnection): void {
        let idx = findIndex(state.graph, otherConnection => isEqual(otherConnection, connection));
        if (idx === -1) {
            console.warn("Note: tried to disconnect", connection);
            throw new Error("Invalid call to disconnect: the connection does not exist");
        }
        state.graph.splice(idx, 1);
    }

    export function create(spec: IEffectSpec): number {
        let id = ++lastID;
        console.log("Creating", spec, id);

        let channels = spec.channels;
        let toUI = (msg: any) => onStateChange(JSON.stringify({
                transient: true,
                toId: id,
                msg
            }));
        let emitAudio = processAudio.bind(null, id);
        let emitMidi = processMidi.bind(null, id);

        switch (spec.symbol) {
            case "live.effects.soundfont.Soundfont":
                effects[id] = new Soundfont({id, channels, toUI, emitAudio, emitMidi});
                break;
            case "live.effects.midiBridge.MidiBridge":
                effects[id] = new MidiBridge({id, channels, toUI, emitAudio, emitMidi});
                break;
            default:
                console.log("Unknown type", spec.symbol);
        }
        // create
        return id;
    }

    export function destroy(spec: {id: number}): void {
        console.log("Destroying", spec.id);
        // destroy
    }

    export function toEffect(effect: IEffect, anything: {}): void {
        if (effects[effect.id]) {
            effects[effect.id].fromUI(anything);
        } else {
            console.log("Could not direct to unknown", anything);
        }
    }

    export function quit(): void {
        runner = null;
        startRunning = null;
        // nothing to do here.
    }
}

/**
 * Methods for validating the front-end library and apps.
 */
export module Test {
    function _beginFrame() {
        forEach(effects, effect => {
            if (effect) {
                effect.__metaTestRemainingIn__ = {};
            }
        });
        forEach(effects, effect => {
            if (effect instanceof ReceiverF) {
                effect.received = [];
            } else if (effect instanceof ReceiverM) {
                (effect as any).received = [];
            }
        });
    }

    function _processLeaves() {
        let nodes = effects.reduce((memo, effect) => {
            return memo.concat(times(effect.channels, (chan) => ({
                id: effect.id,
                chan: chan
            })));
        }, [] as {id: number, chan: number}[]);

        let leaves = filter(nodes, node =>
            !some(state.graph, connection =>
                connection.to === node.id &&
                connection.toChannel === node.chan));

        forEach(leaves, leaf => effects[leaf.id].audioEvent(leaf.chan, "^"));
    }

    export interface IFrameOutput {
        audio: {[key: string]: string};
        midi: {[key: string]: IMidiEv[]};
    }

    function _endFrame(): IFrameOutput {
        let output: IFrameOutput = {
            audio: {},
            midi: {}
        };

        forEach(effects, effect => {
            if (effect instanceof ReceiverF) {
                output.audio[effect.name] = effect.received[0];
                effect.received = null;
            } else if (effect instanceof ReceiverM) {
                let fx = (effect as any) as ReceiverM;
                output.midi[fx.name] = fx.received;
                fx.received = null;
            }
        });

        return output;
    }

    /**
     * Simulates a single audio frame.
     * Returns a string representing the stream for every output.
     *
     * e.g., calling audioFrame() when the engine is setup as:
     *  <PhysicalOutput all audio>
     *    <PhysicalInput all audio />
     *    <Remap map={{0: 1, 1: 0}}>
     *      <PhysicalInput all audio />
     *    </Remap>
     *  </PhysicalOutput>
     * 
     * could yield:
     *  {
     *      audio: {
     *          "Dummy Output (left)": "<^ | Dummy Input (left)>, <^ | Dummy Input (right)>",
     *          "Dummy Output (right)": "<^ | Dummy Input (right)>, <^ | Dummy Input (left)>",
     *      },
     *      midi: {
     *          "Dummy MIDI Output": [],
     *      },
     *  }
     */
    export function audioFrame(): IFrameOutput {
        _beginFrame();
        _processLeaves();
        return _endFrame();
    }

    /**
     * Similar to above, but with a midi input. The audio outputs are of course
     * only simulated.
     * 
     * e.g., calling midiFrame({note: 80, ...}) when the engine is setup as:
     *  <PhysicalOutput all audio>
     *    <Synth channel={0} program="Piano">
     *      <PhysicalInput all midi />
     *    </Synth>
     *  </PhysicalOutput>
     *
     *  could yield:
     *  {
     *      "Dummy Output (left)": "^ | NOTE_ON(80, 128) Piano (left)",
     *      "Dummy Output (right)": "^ | NOTE_ON(80, 128) Piano (right)",
     *      "Dummy MIDI Output": "^",
     *  }
     */
    export function midiFrame(ev: IMidiEv): IFrameOutput {
        return midiFrameBridged(function() {
            let id = find(state.store, item => item.name === "Dummy MIDI Input").id;
            effects[id].midiEvent(ev);
        });
    }

    /**
     * Like midiFrame, but the output is becuase of another kind of event, like a UI event.
     * The exec() function does that event.
     */
    export function midiFrameBridged(exec: () => void): IFrameOutput {
        _beginFrame();
        exec();
        _processLeaves();
        return _endFrame();
    }
}

export default DragonDummy as IDragonBackend;
