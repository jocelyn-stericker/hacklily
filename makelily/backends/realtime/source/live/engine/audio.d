/** Part of dragon. Copyright (C) Josh Netterfield <joshua@nettek.ca> 2015. */

module live.engine.audio;

import std.algorithm: canFind, countUntil, map;
import std.concurrency: thisTid, register, receive, receiveOnly, locate, send, Tid;
import std.conv: to;
import std.exception: Exception, enforce;
import std.json: JSONValue;
import std.range: array;
import std.stdio: writeln;
import std.string: fromStringz, capitalize;

import live.core.store: Store;
import live.engine.audioImpl: DeviceInfo, AudioEngineImpl, initialize, abort, streamToRTThread;
import live.engine.rtcommands: RTQuit;

export import live.engine.lifecycle: Lifecycle;

class AudioError : Exception {
    this(string msg, string file = __FILE__, size_t line = __LINE__) {
        super(msg, file, line);
    }
    JSONValue serialize() {
        auto jsonValue = JSONValue([
            "error": msg.to!JSONValue,
            "transient": true.to!JSONValue,
        ]);

        return jsonValue;
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
        enforce(state == Lifecycle.ERROR, new AudioError("There is not currently an error."));
    } body {
        return _impl.error;
    }

    const(DeviceInfo[]) devices()
    in {
        enforce(state == Lifecycle.INITIALIZED,
            new AudioError("To query devices, audio must be initialized"));
    } body {
        return _impl.devices;
    }

    AudioEngine initialize()
    in {
        enforce(state == Lifecycle.UNINITIALIZED,
            new AudioError("initialize must only be called when uninitialized."));
    } body {
        _impl = _impl.initialize;
        return this;
    }

    AudioEngine stream(DeviceInfo input, DeviceInfo output, shared Store store)
    in {
        enforce(state == Lifecycle.INITIALIZED,
            new AudioError("start must only be called when initialized."));
        enforce(devices.canFind(input),
            new AudioError("cannot find requested input"));
        enforce(devices.canFind(output),
            new AudioError("cannot find requested output"));
        enforce(input.maxInputChannels > 0,
            new AudioError("device specified for input has no input channels"));
        enforce(output.maxOutputChannels > 0,
            new AudioError("device specified for output has no output channels"));
        enforce(input.defaultSampleRate == output.defaultSampleRate,
            new AudioError("The input and output device must have the same sample rate."));
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

    AudioEngine abort()
    in {
        // Can be in any state
    } out {
        enforce(state == Lifecycle.UNINITIALIZED,
            new AudioError("could not uninitialize"));
    } body {
        _impl = _impl.abort;

        "audioQuittingThread".register(thisTid);
        auto rtThread = locate("rtThread");
        if (rtThread != Tid.init) {
            rtThread.send(RTQuit("audioQuittingThread"));
            receiveOnly!bool();
        }

        return this;
    }

    JSONValue serialize() {
        return JSONValue([
            "state": state.to!string.capitalize.to!JSONValue,
            "error": state == Lifecycle.ERROR ? error.to!JSONValue : JSONValue(null),
            "devices": state == Lifecycle.INITIALIZED ?
                devices.map!(device => device.serialize).array.to!JSONValue :
                JSONValue(null),
        ]);
    }
}

JSONValue serialize(DeviceInfo deviceInfo) {
    return JSONValue([
        "name": deviceInfo.name.to!JSONValue,
        "maxInputChannels": deviceInfo.maxInputChannels.to!JSONValue,
        "maxOutputChannels": deviceInfo.maxOutputChannels.to!JSONValue,
        "defaultSampleRate": deviceInfo.defaultSampleRate.to!JSONValue,
        "isDefaultInput": deviceInfo.isDefaultInput.to!JSONValue,
        "isDefaultOutput": deviceInfo.isDefaultOutput.to!JSONValue
    ]);
}
