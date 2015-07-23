/** Part of dragon. Copyright (C) Josh Netterfield <joshua@nettek.ca> 2015. */
module terabithia.bridge;

import core.memory: GC;
import core.runtime: Runtime;
import core.thread: thread_attachThis;
import std.algorithm: filter;
import std.concurrency: thisTid, register, receive, receiveOnly, locate, send, Tid;
import std.conv: to;
import std.json;
import std.stdio: writeln; // for debugging

import live.core.store: Store;
import live.core.effect: RTCommand, AudioWidth;
import live.engine.audio: AudioEngine, Lifecycle, AudioError;
import live.engine.midi: MidiEngine, MidiError;
import live.engine.rtthread: ReceivePoke;

// So they can be created.
import live.effects.soundfont;
import live.effects.sequencer;

// TLS for dragon_receive thread!
AudioEngine audioEngine;
MidiEngine midiEngine;
string dragon_buffer;

shared Store store;

string recordState() {
    JSONValue state = JSONValue([
        "audio": audioEngine.serialize,
        "midi": midiEngine.serialize,
        "store": store.serialize,
    ]);
    return (&state).toJSON(true /* pretty */);
}

struct StreamCmd {
    string fromName;
    string toName;
}

struct ReceiveQuit {
    string ack;
}

enum QUIT_CMD = -1;

extern(C) {
    void dragon_sendToUIThread(int id, const char* msg) {
    }
    
    int dragon_waveform_getEndFrame() {
        return 0;
    }
    int dragon_waveform_getWidth() {
        return 0;
    }
    int dragon_waveform_setData() {
        return 0;
    }
    
    int dragon_receive(char** ptr) {
        bool shouldQuit = false;
        string quittingThreadName;
        if (!audioEngine) {
            thread_attachThis();
            "receivingThread".register(thisTid);
            audioEngine = new AudioEngine;
            midiEngine = new MidiEngine;
            store = new shared Store("rtThread");
        } else if (audioEngine.state == Lifecycle.UNINITIALIZED) {
            // Fix that.
            audioEngine.initialize;
        } else if (audioEngine.state == Lifecycle.INITIALIZED) {
            // Wait for a request to stream.
            try {
                receive(
                    (ReceiveQuit quit) {
                        quittingThreadName = quit.ack;
                        shouldQuit = true;
                    },
                    (ReceivePoke poke) {
                        // Return the state.
                    },
                    (string command) {
                        writeln("[bridge.d] It works.");
                    },
                    (StreamCmd stream) {
                        writeln("[bridge.d] Attempting to stream from ", stream.fromName, " to ", stream.toName);
                        auto streamFrom = audioEngine.devices.filter!(device => device.name == stream.fromName).front;
                        auto streamTo = audioEngine.devices.filter!(device => device.name == stream.toName).front;
                        audioEngine.stream(streamFrom, streamTo, store);
                        midiEngine.stream(store);
                        writeln("[bridge.d] Looks like we're streaming!");
                    },
                );
            } catch(AudioError error) {
                auto jsonValue = error.serialize();
                dragon_buffer = (&jsonValue).toJSON(true /* pretty */);
                *ptr = cast(char*) dragon_buffer.ptr;
                return dragon_buffer.length.to!int;
            } catch(MidiError error) {
                // TODO: merge
                auto jsonValue = error.serialize();
                dragon_buffer = (&jsonValue).toJSON(true /* pretty */);
                *ptr = cast(char*) dragon_buffer.ptr;
                return dragon_buffer.length.to!int;
            }
        } else if (audioEngine.state == Lifecycle.STREAMING) {
            receive(
                (ReceiveQuit quit) {
                    quittingThreadName = quit.ack;
                    shouldQuit = true;
                },
                (ReceivePoke poke) {
                    // Return the state.
                },
                (string command) {
                    writeln("[bridge.d] It works.");
                },
            );
        } else if (audioEngine.state == Lifecycle.ERROR) {
            receive(
                (ReceiveQuit quit) {
                    quittingThreadName = quit.ack;
                    shouldQuit = true;
                },
                (ReceivePoke poke) {
                    // Return the state.
                },
                (string command) {
                    writeln("[bridge.d] It works.");
                },
            );
        }
        if (shouldQuit) {
            audioEngine.abort();
            audioEngine = null;
            midiEngine.abort();
            midiEngine = null;
            quittingThreadName.locate.send(true);
            return QUIT_CMD;
        }
        dragon_buffer = recordState;
        *ptr = cast(char*) dragon_buffer.ptr;
        return dragon_buffer.length.to!int;
    }
    
    int dragon_send(const char* commandPtr, int commandLen, const char* jsonPtr, int jsonLen) {
        import std.stdio;
        string command = commandPtr[0..commandLen].idup;
        string json = jsonPtr[0..jsonLen].idup;
        writeln("Received: ", command, " ", json);
        if (command == "stream") {
            JSONValue val = json.parseJSON;
            StreamCmd streamCmd = {
                fromName: val["from"].str,
                toName: val["to"].str,
            };
            locate("receivingThread").send(streamCmd);
        } else if (command == "connect") {
            JSONValue val = json.parseJSON;
            "rtThread".locate.send(RTCommand.Connect,
                val["from"].integer.to!int,
                val["to"].integer.to!int,
                val["startChannel"].integer.to!int,
                val["endChannel"].integer.to!int,
                val["offset"].integer.to!int);
        } else if (command == "create") {
            JSONValue val = json.parseJSON;
            auto newID = store.getNewID();
            "rtThread".locate.send(RTCommand.Create,
                newID,
                val["id"].str,
                val["channels"].integer.to!int,
                AudioWidth.Float
            );
            return newID;
        } else if (command == "toEffect") {
            JSONValue val = json.parseJSON;
            "rtThread".locate.send(RTCommand.MessageIn,
                val["effect"].integer.to!int,
                val["msg"].str
            );
        }
        return -1;
    }
    
    void dragon_init() {
        Runtime.initialize();
    }

    void dragon_quit() {
        "quittingThread".register(thisTid);

        auto receiver = locate("receivingThread");
        if (receiver != Tid.init) {
            receiver.send(ReceiveQuit("quittingThread"));
            receiveOnly!bool();
        }

        auto rtThread = locate("rtThread");
        if (rtThread != Tid.init) {
            rtThread.send(RTCommand.Quit, "quittingThread");
            receiveOnly!bool();
        }
        writeln("[bridge.d] Terminating.");
        Runtime.terminate();
    }

    void dragon_poke() {
        auto receiver = locate("receivingThread");
        if (receiver != Tid.init) {
            receiver.send(ReceivePoke());
        }
    }
}
