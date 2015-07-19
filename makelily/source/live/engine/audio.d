/** Part of dragon. Copyright (C) Josh Netterfield <joshua@nettek.ca> 2015. */

module live.engine.audio;

import std.algorithm: canFind, countUntil;
import std.conv: to;
import std.exception: Exception, enforce;
import std.stdio: writeln;
import std.string: fromStringz;

import live.core.store: Store;
import live.engine.audioImpl: DeviceInfo, AudioEngineImpl, initialize, disconnect, streamToRTThread;

export import live.engine.audioImpl: Lifecycle;

class APIError : Exception {
    this(string msg, string file = __FILE__, size_t line = __LINE__) {
        super(msg, file, line);
    }
}

class AudioEngine {
    private AudioEngineImpl _impl;

    this(AudioEngineImpl frame = AudioEngineImpl.init) {
        this._impl = frame;
    }

    Lifecycle state() {
        return _impl.state;
    }

    string error()
    in {
        enforce(state == Lifecycle.ERROR, new APIError("There is not currently an error."));
    } body {
        return _impl.error;
    }

    const(DeviceInfo[]) devices()
    in {
        enforce(state == Lifecycle.INITIALIZED,
            new APIError("To query devices, audio must be initialized"));
    } body {
        return _impl.devices;
    }

    AudioEngine initialize()
    in {
        enforce(state == Lifecycle.UNINITIALIZED,
            new APIError("initialize must only be called when uninitialized."));
    } body {
        _impl = _impl.initialize;
        return this;
    }

    AudioEngine stream(DeviceInfo input, DeviceInfo output, shared Store store)
    in {
        enforce(state == Lifecycle.INITIALIZED,
            new APIError("start must only be called when initialized."));
        enforce(devices.canFind(input),
            new APIError("cannot find requested input"));
        enforce(devices.canFind(output),
            new APIError("cannot find requested output"));
        enforce(input.maxInputChannels > 0,
            new APIError("device specified for input has no input channels"));
        enforce(output.maxOutputChannels > 0,
            new APIError("device specified for output has no output channels"));
        enforce(input.defaultSampleRate == output.defaultSampleRate,
            new APIError("The input and output device must have the same sample rate."));
    } body {
        _impl = _impl.streamToRTThread(
            _impl.devices.countUntil(input).to!int,
            _impl.devices.countUntil(output).to!int,
            input.maxInputChannels,
            output.maxOutputChannels,
            output.defaultSampleRate,
            store
        );
        return this;
    }

    AudioEngine close()
    in {
        enforce(state == Lifecycle.STREAMING, new APIError("Must be streaming"));
    } body {
        _impl = _impl.disconnect;
        return this;
    }
}
