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
import live.core.effect: AudioWidth;
import live.engine.audio: AudioEngine, Lifecycle, AudioError;
import live.engine.midi: MidiEngine, MidiError, MidiQuit;
import live.engine.receivecommands: ReceivePoke, ReceiveInvalidRequest;
import live.engine.rtcommands: RTConnect, RTDisconnect, RTCreate, RTMessageIn;

// So they can be created.
import live.effects.soundfont;
import live.effects.sequencer;

shared Store store;

struct StreamCmd {
    string fromName;
    string toName;
}

struct ReceiveQuit {
    string ack;
}

string recordState(AudioEngine audioEngine, MidiEngine midiEngine,
        shared Store store) {

    JSONValue state = JSONValue([
        "audio": audioEngine.serialize,
        "midi": midiEngine.serialize,
        "store": store.serialize,
    ]);
    return (&state).toJSON(true /* pretty */);
}

enum JS_BRIDGE_QUIT_CMD = -1;

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
        static AudioEngine audioEngine;
        static MidiEngine midiEngine;
        static string dragon_buffer;

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
                    (ReceiveInvalidRequest invalidRequest) {
                        JSONValue transiantError = JSONValue([
                            "transiant": true.to!JSONValue,
                            "error": invalidRequest.explanation.to!JSONValue,
                        ]);
                    },
                    (string command) {
                        writeln("[bridge.d] It works.");
                    },
                    (StreamCmd stream) {
                        writeln("[bridge.d] Attempting to stream from ",
                            stream.fromName, " to ", stream.toName);
                        auto streamFrom = audioEngine.devices.filter!(
                            device => device.name == stream.fromName).front;
                        auto streamTo = audioEngine.devices.filter!(
                            device => device.name == stream.toName).front;
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
            return JS_BRIDGE_QUIT_CMD;
        }
        dragon_buffer = recordState(audioEngine, midiEngine, store);
        *ptr = cast(char*) dragon_buffer.ptr;
        return dragon_buffer.length.to!int;
    }
    
    int dragon_send(const char* commandPtr, int commandLen,
            const char* jsonPtr, int jsonLen) {
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
            RTConnect cmd = {
                id1: val["from"].integer.to!int,
                id2: val["to"].integer.to!int,
                fromChannel: val["fromChannel"].integer.to!int,
                toChannel: val["toChannel"].integer.to!int,
            };
            "rtThread".locate.send(cmd);
        } else if (command == "disconnect") {
            JSONValue val = json.parseJSON;
            RTDisconnect cmd = {
                id1: val["from"].integer.to!int,
                id2: val["to"].integer.to!int,
                fromChannel: val["fromChannel"].integer.to!int,
                toChannel: val["toChannel"].integer.to!int,
            };
            "rtThread".locate.send(cmd);
        } else if (command == "create") {
            JSONValue val = json.parseJSON;
            auto newID = store.getNewID();
            RTCreate cmd = {
                id: newID,
                symbol: val["id"].str,
                channels: val["channels"].integer.to!int,
                width: AudioWidth.Float,
            };
            "rtThread".locate.send(cmd);
            return newID;
        } else if (command == "toEffect") {
            JSONValue val = json.parseJSON;
            RTMessageIn cmd = {
                id: val["effect"].integer.to!int,
                ev: val["msg"].str,
            };
            "rtThread".locate.send(cmd);
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
