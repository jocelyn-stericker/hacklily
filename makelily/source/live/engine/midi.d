/** Part of dragon. Copyright (C) Josh Netterfield <joshua@nettek.ca> 2015. */

module live.engine.midi;

import core.time: dur;
import deimos.portmidi:
    PortMidiStream, PmEvent, PmDeviceInfo,
    
    Pm_Write, Pm_Poll, Pm_MessageStatus, Pm_MessageData1, Pm_MessageData2, Pm_GetDeviceInfo,
    Pm_CountDevices, Pm_OpenInput, Pm_OpenOutput, Pm_Message, Pm_Read;
import std.concurrency: thisTid, receiveTimeout, send, register, locate, OwnerTerminated;
import std.conv: to;

import live.core.effect: Effect, AudioWidth, Connectivity, RTCommand;
import live.core.event: MidiEvent;
import live.core.store: Store;

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

void midiThread(shared Store store) {
    register("midiThread", thisTid);

    class Device {
        PortMidiStream* stream = null;
        int dragonID;
        this() {
            dragonID = store.getNewID();
        }
    }

    Device[string] inputs;
    Device[string] outputs;

    auto rtThread = locate("rtThread");
    void refresh() {
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

                store.insert(d.dragonID, info.name.to!string(),
                    AudioWidth.Float, true, true, Connectivity.Input);

                rtThread.send(RTCommand.Create, d.dragonID,
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

                store.insert(d.dragonID, info.name.to!string(),
                    AudioWidth.Float, true, true, Connectivity.Output);

                rtThread.send(RTCommand.Create, d.dragonID,
                        "live.engine.midi.MidiOut", 1,
                        AudioWidth.Float);
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
                PmEvent* pmev = new PmEvent;
                pmev.message = Pm_Message(ev.message, ev.status1, ev.status2);
                pmev.timestamp = 0;
                Pm_Write(outputs[l].stream, pmev, 1);
            },
            (bool) {
                running = false;
            },
            (OwnerTerminated t) {
                running = false;
            }
        );
        if (running) foreach (name, input; inputs) {
            while (Pm_Poll(input.stream)) {
                PmEvent evnp;
                Pm_Read(input.stream, &evnp, 1);
                auto ev = MidiEvent(
                    cast(byte) Pm_MessageStatus(evnp.message),
                    cast(byte) Pm_MessageData1(evnp.message),
                    cast(byte) Pm_MessageData2(evnp.message)
                );
                rtThread.send(RTCommand.MidiIn, input.dragonID, ev);
            }
        }
    }
}
