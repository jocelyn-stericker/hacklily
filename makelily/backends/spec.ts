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
     * See also ITransientMsg
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

export interface IAudioDevice {
    defaultSampleRate: number;
    isDefaultInput: boolean;
    isDefaultOutput: boolean;
    maxInputChannels: number;
    maxOutputChannels: number;
    name: string;
}

export interface IMidiDevice {
    input: boolean;
    name: string;
    output: boolean;
}

export interface IEffect {
    id: number;
    name: string;
    audioWidth: string;
    connectivity: string;
    isHardware: boolean;
    isMidi: boolean;
}

export interface IEffectFactory {
    id: string;
}

export interface IEffectSpec {
    symbol: string;
    channels: number;
}

export interface IConnection {
    from: number;
    to: number;
    fromChannel: number;
    toChannel: number;
}

export interface IAudioEngine {
    state: Lifecycle;
    error: string;
    devices: IAudioDevice[];
}

export interface IMidiEngine {
    state: Lifecycle;
    error: string;
    devices: IMidiDevice[];
}

export interface IEngineState {
    audio: IAudioEngine;
    factories: IEffectFactory[];
    graph: IConnection[];
    midi: IMidiEngine;
    stateIdx?: number;
    store: IEffect[];
}

export interface ITransientMsg {
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
export interface IDragonBackend {
    run: (cb: (transientMsg: ITransientMsg, engineState: IEngineState) => void) => void;
    stop: () => void;
    startStreaming: (audioDeviceIn: IAudioDevice, audioDeviceOut: IAudioDevice) => void;
    connect: (connection: IConnection) => void;
    disconnect: (connection: IConnection) => void;
    create: (spec: IEffectSpec) => number;
    destroy: (spec: {id: number}) => void;
    toEffect: (effect: IEffect, anything: {}) => void;
    quit: () => void;
}

