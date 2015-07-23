export enum Lifecycle {
    Uninitialized,
    Error,

    Initialized,
    Streaming,
}

export interface AudioDevice {
    defaultSampleRate: number;
    isDefaultInput: boolean;
    isDefaultOutput: boolean;
    maxInputChannels: number;
    maxOutputChannels: number;
    name: string;
}

export interface MidiDevice {
    input: boolean;
    name: string;
    output: boolean;
}

export interface Effect {
    id: number;
    name: string;
    type: string;
    midiIn: boolean;
    midiOut: boolean;
    audioIn: number;
    audioOut: number;
}

export interface EffectFactory {
    id: string;
}

export interface EffectSpec {
    id: string;
    channels: number;
}

export interface Connection {
    from: number;
    to: number;
    startChannel: number;
    endChannel: number;
    offset: number;
}

export interface AudioEngine {
    state: Lifecycle;
    error: string;
    devices: AudioDevice[];
}

export interface MidiEngine {
    state: Lifecycle;
    error: string;
    devices: MidiDevice[];
}

export interface EngineState {
    audio: AudioEngine;
    factories: EffectFactory[];
    graph: Connection[];
    midi: MidiEngine;
    store: Effect[];
}

export interface TransientError {
    error: string;
    transient: boolean;
}

interface IDragon {
    onStateChange: (cb: (engineState: string /* "EngineState" */) => void) => void;
    sendCommand: (func: string, options: string) => number;
    poke: () => void;
    quit: () => void;
}

declare function require(name: string): any;
var Dragon: IDragon = require("./dragon");

var runner: (error: TransientError, engineState: EngineState) => void = null;
var running = false;
var startRunning = function() {
    Dragon.onStateChange(engineState => {
        if (!runner) {
            return;
        }
        let parsedState = JSON.parse(engineState);
        if (parsedState.transient) {
            runner(parsedState, null);
        } else {
            parsedState.audio.state = Lifecycle[parsedState.audio.state];
            parsedState.midi.state = Lifecycle[parsedState.midi.state];
            // We don't have a good way of querying yet, so this is hardcoded.
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
            ];
            runner(null, parsedState);
        }
    });
    running = true;
}
export function run(cb: (error: TransientError, engineState: EngineState) => void) {
    runner = cb;
    if (!running) {
        startRunning();
    } else {
        setTimeout(function() {
            Dragon.poke();
        }, 10);
    }
}

export function stop() {
    Dragon.sendCommand("stop", JSON.stringify({}));
}

export function startStreaming(audioDeviceIn: AudioDevice, audioDeviceOut: AudioDevice) {
    Dragon.sendCommand("stream", JSON.stringify({
        from: audioDeviceIn.name,
        to: audioDeviceOut.name
    }));
}

export function connect(connection: Connection) {
    Dragon.sendCommand("connect", JSON.stringify(connection));
}

export function disconnect(connection: Connection) {
    Dragon.sendCommand("disconnect", JSON.stringify(connection));
}

export function create(spec: EffectSpec) {
    return Dragon.sendCommand("create", JSON.stringify(spec));
}

export function toEffect(effect: Effect, anything: {}) {
    Dragon.sendCommand("toEffect", JSON.stringify({
        effect: effect.id,
        msg: JSON.stringify(anything)
    }));
}

export function quit() {
    runner = null;
    startRunning = null;
    Dragon.quit();
}

/**
 *
 */

// initialize(function(engineState: EngineState) {
// });
