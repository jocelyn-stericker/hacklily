/** Part of dragon. Copyright (C) Josh Netterfield <joshua@nettek.ca> 2015. */

module live.engine.midi;

import core.sync.mutex: Mutex;
import core.time: dur;
import deimos.portmidi:
    PortMidiStream, PmEvent, PmDeviceInfo,
    
    Pm_Write, Pm_Poll, Pm_MessageStatus, Pm_MessageData1, Pm_MessageData2, Pm_GetDeviceInfo,
    Pm_CountDevices, Pm_OpenInput, Pm_OpenOutput, Pm_Message, Pm_Read;
import std.algorithm: map;
import std.concurrency: thisTid, receiveTimeout, send, register, locate, spawn, OwnerTerminated;
import std.conv: to;
import std.exception: Exception, enforce;
import std.json: JSONValue;
import std.range: array;
import std.string: capitalize;

import live.core.effect: Effect, AudioWidth, Connectivity, RTCommand;
import live.core.event: MidiEvent;
import live.core.store: Store;

export import live.engine.lifecycle: Lifecycle;

__gshared Mutex pmMutex;

static this() {
    if (!pmMutex) {
        pmMutex = new Mutex;
    }
}

class MidiError : Exception {
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


enum MidiCommand {
    Refresh,
    MidiOut,    /* MidiEvent ev, string output */
};

class MidiOut : Effect!float {
    import live.core.effect;
    mixin RealtimeEffect!(Features.Midi);
    string midiName;

    void process(immutable(float)* f,
            in int nframes, in int channel, out immutable(float)* fr) {
        fr = f;
    }

    void process(MidiEvent ev) {
        auto midiThread = std.concurrency.locate("midiThread");
        midiThread.send(MidiCommand.MidiOut, ev, midiName);
    }

    void process(string v) {
        midiName = v;
    }
}

private DeviceInfo[] _scanDevices() {
    DeviceInfo[] devices = [];

    synchronized(pmMutex) {
        foreach (i; 0..Pm_CountDevices()) {
            const PmDeviceInfo* info = Pm_GetDeviceInfo(i);

            DeviceInfo deviceInfo = {
                name: info.name.to!string,
                input: !!info.input,
                output: !!info.output,
            };

            devices ~= deviceInfo;
        }
    }

    return devices;
}

JSONValue serialize(DeviceInfo deviceInfo) {
    return JSONValue([
        "name": deviceInfo.name.to!JSONValue,
        "input": deviceInfo.input.to!JSONValue,
        "output": deviceInfo.output.to!JSONValue,
    ]);
}

export class MidiEngine {
    DeviceInfo[] devices;
    string error;
    Lifecycle state;

    this() {
        devices = _scanDevices();
        state = Lifecycle.INITIALIZED;
    }

    MidiEngine abort()
    in {
        // Any state is okay
    } out {
        enforce(state == Lifecycle.UNINITIALIZED,
            new MidiError("Could not uninitialize"));
    } body {
        devices = null;
        state = Lifecycle.UNINITIALIZED;
        return this;
    }

    MidiEngine stream(shared Store store)
    in {
        enforce(state == Lifecycle.INITIALIZED,
            new MidiError("Cannot stream. Not initialized yet."));
    } out {
        enforce(state == Lifecycle.STREAMING,
            new MidiError("Failed to stream."));
    } body {
        devices = null;
        state = Lifecycle.STREAMING;
        (&midiThread).spawn(store);
        return this;
    }

    JSONValue serialize() {
        auto jsonValue = JSONValue([
            "state": state.to!string.capitalize.to!JSONValue,
            "error": state == Lifecycle.ERROR ? error.to!JSONValue : JSONValue(null),
            "devices": state == Lifecycle.INITIALIZED ?
                devices.map!(device => device.serialize).array.to!JSONValue :
                JSONValue(null),
        ]);

        return jsonValue;
    }
}

public struct DeviceInfo {
    string name;
    bool input;
    bool output;
}

export void midiThread(shared Store store) {
    register("midiThread", thisTid);

    class Device {
        PortMidiStream* stream = null;
        int id;
        this() {
            id = store.getNewID();
        }
    }

    Device[string] inputs;
    Device[string] outputs;

    auto rtThread = locate("rtThread");
    void refresh() {
        synchronized(pmMutex) {
            inputs.destroy();
            outputs.destroy();
            foreach (i; 0..Pm_CountDevices()) {
                const PmDeviceInfo* info = Pm_GetDeviceInfo(i);
                Device d = new Device;
                if (info.input) {
                    Pm_OpenInput(
                            &d.stream,
                            i,
                            null /* DRIVER_INFO */,
                            100 /* INPUT_BUFFER_SIZE*/,
                            null /* FIXME. Timer*/,
                            null /* TIME_INFO */
                            );
                    inputs[info.name.to!string()] = d;

                    store.insert(d.id, info.name.to!string(),
                        AudioWidth.Float, true, true, Connectivity.Input);

                    rtThread.send(RTCommand.Create, d.id,
                            "live.engine.rtthread.Passthrough", 1,
                            AudioWidth.Float);
                } else if (info.output) {
                    Pm_OpenOutput(
                            &d.stream,
                            i,
                            null /* DRIVER_INFO */,
                            0 /* OUTPUT_BUFFER_SIZE*/,
                            null /* FIXME. Timer*/,
                            null /* TIME_INFO */,
                            0
                            );
                    outputs[to!string(info.name)] = d;

                    store.insert(d.id, info.name.to!string(),
                        AudioWidth.Float, true, true, Connectivity.Output);

                    rtThread.send(RTCommand.Create, d.id,
                            "live.engine.midi.MidiOut", 1,
                            AudioWidth.Float);
                }
            }
        }
    }
    refresh();

    for (bool running = true; running;) {
        receiveTimeout(dur!("msecs")(10),
            (MidiCommand r) {
                final switch(r) {
                case MidiCommand.Refresh:
                    refresh();
                    break;
                case MidiCommand.MidiOut:
                    assert(0, "Invalid syntax");
                }
            },
            (MidiCommand command, MidiEvent ev, string l) {
                if (command != MidiCommand.MidiOut) {
                    assert(0, "Invalid syntax");
                }
                if (!(l in outputs)) {
                    import std.stdio: writeln;
                    writeln("Dropping midi event to ", l,
                        " which doesn't exist");
                    return;
                }
                synchronized(pmMutex) {
                    PmEvent* pmev = new PmEvent;
                    pmev.message = Pm_Message(ev.message, ev.status1, ev.status2);
                    pmev.timestamp = 0;
                    Pm_Write(outputs[l].stream, pmev, 1);
                }
            },
            (bool) {
                running = false;
            },
            (OwnerTerminated t) {
                running = false;
            }
        );
        if (running) {
            foreach (name, input; inputs) {
                synchronized(pmMutex) {
                    while (Pm_Poll(input.stream)) {
                        PmEvent evnp;
                        Pm_Read(input.stream, &evnp, 1);
                        auto ev = MidiEvent(
                            cast(byte) Pm_MessageStatus(evnp.message),
                            cast(byte) Pm_MessageData1(evnp.message),
                            cast(byte) Pm_MessageData2(evnp.message)
                        );
                        rtThread.send(RTCommand.MidiIn, input.id, ev);
                    }
                }
            }
        }
    }
}
