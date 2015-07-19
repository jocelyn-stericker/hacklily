export enum Lifecycle {
    UNINITIALIZED,
    ERROR,

    INITIALIZED,
    STREAMING,
}

export interface AudioDevice {
    name: string;
    maxInputChannels: number;
    maxOutputChannels: number;
    defaultSampleRate: number;
    isDefaultInput: boolean;
    isDefaultOutput: boolean;
}

export interface Effect {
    id: string;
    type: string;
    midiIn: boolean;
    midiOut: boolean;
    audioIn: number;
    audioOut: number;
}

export interface EffectFactory {
    id: string;
}

export interface Connection {
    from: string;
    to: string;
    startChannel: number;
    endChannel: number;
    offset: number;
    midi: boolean;
}

export interface EngineState {
    state: Lifecycle;
    error: string;
    audioDevices: AudioDevice[];
    effects: Effect[];
    graph: Connection[];
    factories: EffectFactory[];
}

interface IDragon {
    onStateChange: (cb: (engineState: string /* "EngineState" */) => void) => void;
    sendCommand: (func: string, options: string) => void;
}

declare function require(name: string): any;
var Dragon: IDragon = require("./dragon");

export function initialize(cb: (engineState: EngineState) => void) {
    Dragon.onStateChange(engineState => cb(JSON.parse(engineState)));
    Dragon.sendCommand("initialize", "");
}

export function stop() {
    Dragon.sendCommand("stop", "");
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

export function create(factory: EffectFactory) {
    Dragon.sendCommand("create", JSON.stringify(factory));
}

export function toEffect(effect: Effect, anything: {}) {
    Dragon.sendCommand("toEffect", JSON.stringify(anything));
}

/**
 *
 */

// initialize(function(engineState: EngineState) {
// });
initialize(function(engineState: EngineState) {
    console.log(JSON.stringify(engineState, null, 2));
});
