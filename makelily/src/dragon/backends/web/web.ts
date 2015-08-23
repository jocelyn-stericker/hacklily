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
import Effect from "./effect";

let AudioContextImpl = (window as any).AudioContext || (window as any).webkitAudioContext;

let runner: (transientMsg: ITransientMsg, engineState: IEngineState) => void = null;
let running: boolean = false;
let onStateChange: (newEngineState: string) => void;
let effects: Effect[] = [];

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
    store: [],
    stateIdx: 1,
    factories: [
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

function sendState() {
    ++state.stateIdx;
    if (onStateChange) {
        onStateChange(JSON.stringify(state));
    }
}

let context: AudioContext;

let startRunning = function(): void {
    if (context) {
        throw new Error("Context already exists");
    }
    context = new AudioContextImpl;

    let destination = context.destination;
    // destination.channelCount = 2; // Attempt to force stereo. We also should really have a mono implementation.

    let merger = context.createChannelMerger();
    merger.connect(destination);

    let mergerL = context.createChannelMerger(1);
    let mergerR = context.createChannelMerger(1);
    mergerL.connect(merger, 0, 0);
    mergerR.connect(merger, 0, 1);

    let outID = ++lastID;
    state.store.push({
        audioWidth: "Float",
        connectivity: "Output",
        id: outID,
        isHardware: true,
        isMidi: false,
        name: "Output (L)"
    });
    effects[outID] = new ReceiverF({
        channels: 1,
        id: outID,
        emitMidi: (ev) => processMidi(outID, ev),
        name: "Output (L)",
        toUI: (msg: any) => {/* pass */},
        audioNodeIn: mergerL,
        audioNodeOut: null,
    });

    let outIDR = ++lastID;
    state.store.push({
        audioWidth: "Float",
        connectivity: "Output",
        id: outIDR,
        isHardware: true,
        isMidi: false,
        name: "Output (R)"
    });
    effects[outIDR] = new ReceiverF({
        channels: 1,
        id: outIDR,
        emitMidi: (ev) => processMidi(outIDR, ev),
        name: "Output (R)",
        toUI: (msg: any) => {/* pass */},
        audioNodeIn: mergerR,
        audioNodeOut: null,
    });

    if (navigator.requestMIDIAccess) {
        navigator.requestMIDIAccess().
            then((midi) => {
                midi.inputs.forEach((key: WebMidi.MIDIInput, port: string) => {
                    let effectID = DragonWeb.create({
                        symbol: "live.effects.midiBridge.MidiBridge",
                        channels: 2
                    });

                    state.store.push({
                        audioWidth: "Float",
                        connectivity: "Input",
                        id: effectID,
                        isHardware: true,
                        isMidi: true,
                        name: `${key.name} (${key.manufacturer})`
                    });

                    key.onmidimessage = function(event) {
                        let str = "MIDI message received at timestamp " + event.timeStamp + "[" + event.data.length + " bytes]: ";
                        let b1 = event.data[0];
                        let eventType = Math.floor(b1/16);
                        let channel = b1 % 16;
                        let note = event.data[1];
                        let velocity = event.data[2];

                        // for (let i = 0; i < event.data.length; ++i) {
                        //     str += "0x" + event.data[i].toString(16) + " ";
                        // }
                        // console.log(str);
                        let ev: IMidiEv;
                        if (eventType === 9) {
                            ev = {
                                type: "NOTE_ON",
                                note,
                                velocity,
                                channel
                            };
                        } else if (eventType === 8) {
                            ev = {
                                type: "NOTE_OFF",
                                note,
                                velocity: 0,
                                channel
                            };
                        } else if (eventType === 0xB) {
                            ev = {
                                type: "CONTROL_CHANGE",
                                note, // 0x40 is damper
                                velocity, // either 128 or 0
                                channel
                            }
                        } else {
                            console.log("Ignoring event ", eventType, channel, note, velocity);
                        }

                        if (ev) {
                            DragonWeb.toEffect({id: effectID} as any, {
                                event: ev,
                            });
                        }
                    }
                });
            }).
            catch(function error(err) {
                console.log("Could not get MIDI access", err);
            });
    } else {
        console.log("MIDI access unsupported on this system.");
    }

    // TODO(jnetterf): Mode to replace it with [webkit]getUserMedia({audio: true}, ..., ...)
    // Likely, this will be done by a request after initialization. e.g., in response to a
    // connection from the input?
    // navigator.webkitGetUserMedia({audio: true}, function(stream) {
    //     var input = context.createMediaStreamSource(stream);
    // }, function(err) {
    //     console.error(err);
    // });

    let micIn = context.createChannelMerger();
    let inID = ++lastID;
    state.store.push({
        audioWidth: "Float",
        connectivity: "Output",
        id: inID,
        isHardware: true,
        isMidi: false,
        name: "Microphone"
    });
    effects[inID] = new ReceiverF({
        channels: micIn.channelCount,
        id: inID,
        emitMidi: (ev) => processMidi(inID, ev),
        name: "Microphone",
        toUI: (msg: any) => {/* pass */},
        audioNodeIn: micIn,
        audioNodeOut: null,
    });

    console.log("WAH!");
    (window as any).yolo = context;

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

module DragonWeb {
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
        let fromNode = effects[connection.from].audioNodeOut;
        let toNode = effects[connection.to].audioNodeIn;
        if (connection.toChannel !== -1) {
            fromNode.connect(toNode, connection.fromChannel, connection.toChannel);
        }

        sendState();
    }

    export function disconnect(connection: IConnection): void {
        let idx = findIndex(state.graph, otherConnection => isEqual(otherConnection, connection));
        if (idx === -1) {
            console.warn("Note: tried to disconnect", connection);
            throw new Error("Invalid call to disconnect: the connection does not exist");
        }
        state.graph.splice(idx, 1);

        let fromNode = effects[connection.from].audioNodeOut;
        let toNode = effects[connection.to].audioNodeIn;

        if (connection.toChannel !== -1) {
            fromNode.disconnect();
            // We now need to reconnect all the nodes from 'fromNode'.
            state.graph.forEach(c => {
                if (c.from === connection.from) {
                    let t = effects[c.to].audioNodeIn;
                    fromNode.connect(t, c.fromChannel, c.toChannel);
                }
            });
        }

        sendState();
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
        let emitMidi = processMidi.bind(null, id);

        let audioNodeIn = context.createChannelMerger(2);
        let audioNodeOut = context.createChannelSplitter(2);

        switch (spec.symbol) {
            case "live.effects.soundfont.Soundfont":
                effects[id] = new Soundfont({id, audioNodeIn, audioNodeOut, channels, toUI, emitMidi}, context);
                break;
            case "live.effects.midiBridge.MidiBridge":
                audioNodeIn.connect(audioNodeOut);
                effects[id] = new MidiBridge({id, audioNodeIn, audioNodeOut, channels, toUI, emitMidi});
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

export let isSupported = !!AudioContextImpl;
let enabled = false;

export function enableCB() {
    // create empty buffer
	var buffer = context.createBuffer(1, 1, 22050);
	var source = context.createBufferSource();
	source.buffer = buffer;

	// connect to output (your speakers)
	source.connect(context.destination);

	// play the file
	source.start(0);
    
    setTimeout(function() {
        let nsource = state as any;
            if((nsource.playbackState === nsource.PLAYING_STATE || nsource.playbackState === nsource.FINISHED_STATE)) {
                console.log("Ensured iOS enabled");
                window.removeEventListener("mousedown", enableCB, false);
            }
        }, 0);
}

export function ensureEnabled() {
    window.addEventListener("mousedown", enableCB, false);
}

export default DragonWeb as IDragonBackend;
