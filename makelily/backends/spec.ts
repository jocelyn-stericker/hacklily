/**
 * Structured used by the backend and implemented by the frontend.
 */

/**
 * The current state of the engine. Not all backends will implement all
 * states. For example, if the platform only has one device and no options,
 * the platform can go from unitialized to streaming.
 */
export enum Lifecycle {
    /**
     * The engine is not started yet.
     * No action is needed to initialize it.
     */
    Uninitialized = 0,

    /** 
     * A permenant error has occured.
     * See also TransientMsg
     */
    Error = 1,

    /**
     * A list of devices is ready.
     */
    Initialized = 2,

    /**
     * A graph can be constructed.
     */
    Streaming = 3,
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
    audioWidth: string;
    connectivity: string;
    isHardware: boolean;
    isMidi: boolean;
}

export interface EffectFactory {
    id: string;
}

export interface EffectSpec {
    symbol: string;
    channels: number;
}

export interface Connection {
    from: number;
    to: number;
    fromChannel: number;
    toChannel: number;
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
    stateIdx?: number;
    store: Effect[];
}

export interface TransientMsg {
    /**
     * The target effect, or 'undefined' if the target is the root component.
     */
    toId?: number;

    /**
     * The error, if the transient message is an error.
     */
    error?: string;

    /**
     * The message, if the transient message is not an error.
     */
    msg?: string;

    /**
     * True.
     * 
     * Set to allow reflection.
     */
    transient: boolean;
}

/**
 * The Dragon backend API, which is injected into the frontend's DragonApp
 */
export interface DragonBackend {
    run: (cb: (transientMsg: TransientMsg, engineState: EngineState) => void) => void;
    stop: () => void;
    startStreaming: (audioDeviceIn: AudioDevice, audioDeviceOut: AudioDevice) => void;
    connect: (connection: Connection) => void;
    disconnect: (connection: Connection) => void;
    create: (spec: EffectSpec) => number;
    destroy: (spec: {id: number}) => void;
    toEffect: (effect: Effect, anything: {}) => void;
    quit: () => void;
}

