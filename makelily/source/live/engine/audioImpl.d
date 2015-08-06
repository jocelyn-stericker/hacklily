/** Part of dragon. Copyright (C) Josh Netterfield 2015. */

module live.engine.audioImpl;

import core.time: dur;
import deimos.portaudio:
    PaDeviceInfo, PaDeviceIndex, PaStreamCallbackTimeInfo, PaStreamCallbackFlags,
    PaStream, PaStreamParameters,

    Pa_GetDeviceCount, Pa_GetDeviceInfo, Pa_GetVersionText, Pa_GetDefaultInputDevice,
    Pa_GetDefaultOutputDevice, Pa_Initialize, Pa_GetErrorText, Pa_OpenStream,
    Pa_StartStream, Pa_StopStream, Pa_CloseStream,

    paNoError, paNoDevice, paFloat32, paNonInterleaved, paNoFlag;
import std.concurrency: locate, send, thisTid, receiveTimeout, spawn, register, Tid;
import std.conv: to;
import std.exception: Exception, enforce;
import std.stdio: writeln;
import std.string: fromStringz, toStringz;

import live.core.effect: AudioWidth, Connectivity;
import live.core.store: Store;
import live.engine.lifecycle: Lifecycle;
import live.engine.rtcommands: RTCreate, RTQuit, RTActivate, RTBeginProc,
    RTAudioIn, RTAudioOutPtr, RTEndProc;
import live.engine.rtthread: rtLoop;

class ImplementationError : Exception {
    this(string msg, string file = __FILE__, size_t line = __LINE__) {
        super(msg, file, line);
    }
}

export struct DeviceInfo {
    string name;
    int maxInputChannels;
    int maxOutputChannels;
    double defaultSampleRate;
    bool isDefaultInput;
    bool isDefaultOutput;
    string toString() const {
        return "[DeviceInfo: " ~ this.name ~ "] " ~
            "in:" ~ this.maxInputChannels.to!string ~ " " ~
            "out:" ~ this.maxOutputChannels.to!string ~ " " ~
            "sampleRate:" ~ this.defaultSampleRate.to!string ~
            (this.isDefaultInput ? " (is default input)" : "") ~
            (this.isDefaultOutput ? " (is default output)" : "");
    }
}

class UserData {
    string threadName;
    PaStream* stream;
    int[] inputIDs = [];
    int[] outputIDs = [];

    this(string threadName) {
        this.threadName = threadName;
    }
}

export struct AudioEngineImpl {
    Lifecycle state = Lifecycle.UNINITIALIZED;

    /**
     * An error, if state == ERROR
     */
    string error;

    /**
     * A list of devices.
     * 
     * Valid if state == INITIALIZED or STREAMING
     */
    DeviceInfo[] devices;

    UserData userData;
}

shared bool created = false;

export AudioEngineImpl initialize(AudioEngineImpl oldAudio) {
    if (!created) {
        ("[audio.d] Using " ~ Pa_GetVersionText.fromStringz).writeln();
        if (Pa_Initialize() != paNoError) {
            ("[audio.d] Using " ~ Pa_GetVersionText.fromStringz).writeln();

            AudioEngineImpl newAudio = {
                state: Lifecycle.ERROR,
                error: "Could not initialize portaudio."
            };
            return newAudio;
        }
        created = true;
    }

    PaDeviceIndex defaultInput = Pa_GetDefaultInputDevice();
    PaDeviceIndex defaultOutput = Pa_GetDefaultOutputDevice();

    int numDevices = Pa_GetDeviceCount();
    DeviceInfo[] devices = [];
    foreach (i; 0 .. numDevices) {
        const(PaDeviceInfo)* deviceInfo = Pa_GetDeviceInfo(i);
        DeviceInfo info = {
            name: deviceInfo.name.fromStringz.idup,
            maxInputChannels: deviceInfo.maxInputChannels,
            maxOutputChannels: deviceInfo.maxOutputChannels,
            defaultSampleRate: deviceInfo.defaultSampleRate,
            isDefaultInput: i == defaultInput,
            isDefaultOutput: i == defaultOutput,
        };
        devices ~= info;
    }

    AudioEngineImpl newAudio = {
        state: Lifecycle.INITIALIZED,
        devices: devices.dup
    };

    return newAudio;
}

export AudioEngineImpl streamToRTThread(AudioEngineImpl oldState, int input, int output, int inChannels, int outChannels, double sampleRate, shared Store store) {
    AudioEngineImpl newState = {
        state: Lifecycle.STREAMING,
        devices: oldState.devices,
        userData: new UserData(store.threadName)
    };

    PaStreamParameters inputParams = {
        device: input,
        channelCount: inChannels,
        sampleFormat: paFloat32 | paNonInterleaved,
        suggestedLatency: 0
    };

    PaStreamParameters outputParams = {
        device: output,
        channelCount: outChannels,
        sampleFormat: paFloat32 | paNonInterleaved,
        suggestedLatency: 0
    };

    auto bufferSize = 1024;

    auto err = Pa_OpenStream(
        &newState.userData.stream,
        &inputParams,
        &outputParams,
        sampleRate,
        bufferSize,
        paNoFlag,
        &process,
        cast(void *) newState.userData);

    if (err != paNoError) {
        AudioEngineImpl failureState = {
            state: Lifecycle.ERROR,
            error: Pa_GetErrorText(err).to!string
        };
        return failureState;
    }

    /*---- REALTIME THREAD STARTS HERE! ----------------------------------*/

    Tid rtThread = (&rtLoop).spawn(bufferSize, sampleRate.to!int, store);
    store.threadName.register(rtThread);
    int oneId, twoId;

    foreach (i; 0..inChannels) {
        int id = store.getNewID();

        RTCreate cmd = {
            id: id,
            symbol: "live.engine.rtthread.Passthrough",
            channels: 1,
            width: AudioWidth.FloatHWIN,
        };
        rtThread.send(cmd);

        store.insert(id, "Input " ~ i.to!string,
            AudioWidth.FloatHWIN, false, true, Connectivity.Input);

        newState.userData.inputIDs ~= id;
        oneId = id;
    }

    foreach (i; 0..outChannels) {
        int id = store.getNewID();

        RTCreate cmd = {
            id: id,
            symbol: "live.engine.rtthread.ReceiverF",
            channels: 1,
            width: AudioWidth.Float,
        };
        rtThread.send(cmd);

        store.insert(id, "Output " ~ i.to!string,
            AudioWidth.Float, false, true, Connectivity.Output);

        newState.userData.outputIDs ~= id;
        twoId = id;
    }

    err = Pa_StartStream(newState.userData.stream);

    if (err != paNoError) {
        rtThread.send(RTQuit.init);
        AudioEngineImpl failureState = {
            state: Lifecycle.ERROR,
            error: Pa_GetErrorText(err).to!string
        };
        return failureState;
    }

    rtThread.send(RTActivate.init);
    return newState;
}

export AudioEngineImpl abort(AudioEngineImpl oldState) {
    if (oldState.userData && oldState.userData.stream) {
        Pa_StopStream(oldState.userData.stream);
        Pa_CloseStream(oldState.userData.stream);
    }

    return AudioEngineImpl.init;
}

extern(C) int process(const(void)* inputBufferPtr, void* outputBufferPtr,
                             size_t nframes,
                             const(PaStreamCallbackTimeInfo)* timeInfo,
                             PaStreamCallbackFlags statusFlags,
                             void *userDataPtr)
{
    auto userData = cast(UserData) userDataPtr;
    auto inputBuffer = cast(immutable(float)**) inputBufferPtr;
    auto outputBuffer = cast(shared(float)**) outputBufferPtr;

    auto rtThread = userData.threadName.locate;

    /////
    foreach(index, id; userData.outputIDs) {
        RTAudioOutPtr!float cmd = {
            id: id,
            data: outputBuffer[index],
            nframes: nframes.to!int,
        };
        rtThread.send(cmd);
    }

    rtThread.send(RTBeginProc.init);

    foreach(index, id; userData.inputIDs) {
        RTAudioIn!float cmd = {
            id: id,
            data: inputBuffer[index],
            nframes: nframes.to!int,
        };
        rtThread.send(cmd);
    }

    {
        RTEndProc cmd = {
            requester: cast(shared(Tid)) thisTid,
        };
        rtThread.send(cmd);
    }

    foreach(id; userData.outputIDs) {
        RTAudioOutPtr!float cmd = {
            id: id,
            data: null,
            nframes: nframes.to!int,
        };
        rtThread.send(cmd);
    }
    if (!receiveTimeout(dur!("seconds")(2), (bool) {})) {
        "Realtime thread is dead.".writeln;
    }
    /////
    
    return 0;
}
