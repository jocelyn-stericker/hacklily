/** Part of dragon. Copyright (C) Josh Netterfield <joshua@nettek.ca> 2015. */

module live.engine.rtthread;

import core.memory: GC;
import std.array: popFront;
import std.concurrency: thisTid, receive, locate, send, OwnerTerminated, Tid;
import std.conv: to;
import std.exception: enforce;
import std.variant: Variant;

import live.core.effect: AudioWidth, Effect, rtThread_effect;
import live.core.event: MidiEvent;
import live.core.store: Store;
import live.engine.receivecommands: ReceivePoke, ReceiveInvalidRequest,
    ReceiveConnectionReceipt, ReceiveDisconnectionReceipt;
import live.engine.rtcommands: RTActivate, RTBeginProc, RTEndProc,
    RTPing, RTQuit, RTSetSampleRate, RTDestroyEffect, RTConnect, RTDisconnect,
    RTCreate, RTAudioIn, RTAudioOutPtr, RTMidiInEvent, RTMidiOutEvent,
    RTMessageIn, RTMessageOut;

shared bool isActive = false;

export class Passthrough : Effect!float {
    import live.core.effect;
    mixin RealtimeEffect!(Features.Dual);

    void process(immutable(float)* input, in int nframes, in int channel,
            out immutable(float)* output) {
        output = input;
    }

    void process(MidiEvent event) {
        emit(event);
    }

    void process(string command) {
        emit(command);
    }
}

export class Receiver(type) : Effect!type {
    import live.core.effect;
    mixin RealtimeEffect!(Features.Audio);

    shared(type*) deviceBuffer = null;

    void process(immutable(type)* input, in int nframes, in int channel,
            out immutable(type)* output) {
        if (deviceBuffer) {
            deviceBuffer[0..nframes] = input[0..nframes];
        }
        output = input;
    }

    void process(MidiEvent event) {
        emit(event);
    }

    void process(string command) {
        emit(command);
    }
}

export class ReceiverF : Receiver!float {
}

export class ReceiverD : Receiver!double {
}

shared bool quitting = false;

private class Connection(audioType) {
    Effect!audioType from;
    Effect!audioType to;
    int fromChannel;
    int toChannel = -1;
    this(Effect!audioType from, Effect!audioType to, int fromChannel, int toChannel) {
        this.from = from;
        this.to = to;
        this.fromChannel = fromChannel;
        this.toChannel = toChannel;
        this();
    }
    this() {
        to.inputs[toChannel] = to.inputs.get(toChannel, 0) + 1;
        auto receivingThread = "receivingThread".locate;
        if (receivingThread != Tid.init) {
            ReceiveConnectionReceipt receipt = {
                fromId: from.id,
                toId: to.id,
                fromChannel: fromChannel,
                toChannel: toChannel,
            };
            receivingThread.send(receipt);
        }
    }
    ~this() {
        if (quitting || toChannel == -400) {
            return;
        }
        auto receivingThread = "receivingThread".locate;
        if (receivingThread != Tid.init) {
            ReceiveDisconnectionReceipt receipt = {
                fromId: from.id,
                toId: to.id,
                fromChannel: fromChannel,
                toChannel: toChannel,
            };
            receivingThread.send(receipt);
        }
        to.inputs[toChannel] = to.inputs.get(toChannel, 0) - 1;
        toChannel = -400;
    }
}

public int sender = -1;

void process(audioType, msgType)(Connection!(audioType)[int][int] connections, msgType ev, int from) {
    foreach (connectionsFromTarget; connections) {
        if (-1 in connectionsFromTarget) {
            auto connection = connectionsFromTarget[-1];

            auto senderBk = sender;
            scope(exit) sender = senderBk;
            sender = from;

            connection.to.process(ev);
            break;
        }
    }
}

// TODO(jnetterf): unittest this.
void rtLoop(int nframes, int sampleRate, shared Store store) {
    quitting = false;
    rtThread_effect = thisTid;
    import std.stdio;

    bool isInProc = false;
    int gc_start = 50;

    struct RecurseGraphData(type) {
        Effect!type effect;
        int chan;
        immutable(type*) buffer;
        this(Effect!type effect, int chan,
                immutable(type*) buffer) {
            this.effect = effect;
            this.chan = chan;
            this.buffer = buffer;
        }
    }

    void recurseGraph(type)(Connection!(type)[int][int][int] connections,
            ref RecurseGraphData!type[] queue, Effect!type effect,
            immutable(type)* inData, int chan, type*[int] mixerBuffer) {

        immutable(type)* buffer;

        effect.process(inData, nframes, chan, buffer);
        queue ~= RecurseGraphData!type(effect, chan, buffer);
    }

    void recurseGraphContinue(type)(Connection!(type)[int][int][int] connections,
            ref RecurseGraphData!type[] queue, type*[int] mixerBuffer) {

        assert(queue.length, "recurseGraphContinue expected more items in the queue");
        RecurseGraphData!type t = queue[0];
        queue.popFront();

        auto effect = t.effect;
        auto chan = t.chan;
        auto buffer = t.buffer;

        foreach (connectionsFromEffect; connections[effect.id]) {
            if (chan in connectionsFromEffect) {
                auto connection = connectionsFromEffect[chan];
                auto senderBk = sender;
                scope(exit) sender = senderBk;
                sender = effect.id;

                int iID = connection.to.id;
                auto iInputs = connection.to.inputs;

                if (iInputs[connection.toChannel] == 1) {
                    recurseGraph(connections, queue, connection.to, buffer,
                            connection.toChannel, mixerBuffer);
                } else {
                    assert(iInputs[connection.toChannel] > 1, "recurseGraphContinue expected a valid connection");
                    int code = iID * 10000 + connection.toChannel;

                    type* buffer2 = mixerBuffer[code];
                    buffer2[0..nframes] += buffer[0..nframes];
                    --inputsToGo[code];
                    if (!inputsToGo[code]) {
                        recurseGraph(connections, queue, connection.to,
                                cast(immutable(type)*) buffer2,
                                connection.toChannel, mixerBuffer);
                    }
                }
            }
        }
    }

    void beginProc(type)(Connection!(type)[int][int][int] connections,
            Effect!(type)[int] effects,
            ref RecurseGraphData!type[] queue,
            immutable(type)* zero, type*[int] mixerBuffer) {

            foreach (code, ref count; inputsToGo) {
                int id = code / 10000;
                int chan = code % 10000;
                if (id in effects) {
                    count = effects[id].inputs[chan];
                    mixerBuffer[code][0..nframes] = 0.0f;
                }
            }
            foreach (code, exists; disconnected) {
                assert(exists, "beginProc expected a connection from an existing effect");
                int id = code / 10000;
                int chan = code % 10000;
                if (!(id in effects)) continue;
                recurseGraph(connections, queue, effects[id], zero, chan,
                        mixerBuffer);
            }
    }

    void disconnect(type)(int id1, int id2, int fromChannel, int toChannel,
            Connection!(type)[int][int][int] connections,
            Effect!(type)[int] effects,
            type*[int] mixerBuffers) {
        if ((id1 in connections) && (id2 in connections[id1]) && (fromChannel in connections[id1][id2])) {
            destroy(connections[id1][id2][fromChannel]);
            connections[id1][id2].remove(fromChannel);
            auto count = effects[id2].inputs[toChannel];
            if (count == 1) {
                mixerBuffers.remove(id2*10000 + toChannel);
                inputsToGo.remove(id2*10000 + toChannel);
            } else if (count == 0) {
                disconnected[id2*10000 + toChannel] = true;
            }
        } else {
            import std.stdio;
            writeln("Could not disconnect ", id1, " to ", id2, " on channel ", fromChannel);
        }
    }

    bool connect(type)(int id1, int id2, int fromChannel, int toChannel,
            ref Connection!(type)[int][int][int] connections,
            ref Effect!(type)[int] effects,
            ref type*[int] mixerBuffers) {

        if (!(id1 in effects) || !(id2 in effects)) {
            return false;
        }
        if (fromChannel >= effects[id1].channels) {
            requestWasInvalid("Invalid fromChannel " ~ fromChannel.to!string ~ " in connection from id " ~ id1.to!string);
            return true;
        }
        if (toChannel >= effects[id1].channels) {
            requestWasInvalid("Invalid toChannel " ~ toChannel.to!string ~ " in connection to id " ~ id2.to!string);
            return true;
        }
        connections[id1][id2][fromChannel] = 
            new Connection!type(effects[id1], effects[id2], fromChannel, toChannel);

        auto count = effects[id2].inputs[toChannel];

        if (count == 1) {
            disconnected.remove(id2*10000 + toChannel);
        } else if (count == 2) {
            mixerBuffers[id2*10000 + toChannel] = cast(type*) GC.calloc(
                type.sizeof * nframes);
            inputsToGo[id2*10000 + toChannel] = count;
        }

        return true;
    }
    
    void create(type)(string symbol, int channels, int id,
            ref Effect!(type)[int] effects,
            ref Connection!(type)[int][int][int] connections, bool hardware) {
        effects[id] = cast(Effect!type) Object.factory(symbol);
        if (!effects[id]) {
            import std.stdio;
            ("[rtthread.d] WARNING: Invalid symbol " ~ symbol).writeln;
            return;
        }
        effects[id].initialize(id, channels, nframes, sampleRate);
        connections[id] = null;
        if(!hardware) foreach (channel; 0..channels) {
            disconnected[id*10000 + channel] = true;
        }
    }

    void sendToEffect(type1, type2)
            (int id, Effect!(type1)[int] effects, type2 ev) {
        if (id in effects) {
            effects[id].process(ev);
        }
    }

    void sendFromEffect(type1, type2)(int id,
            Connection!(type1)[int][int][int] connections,
            Effect!(type1)[int] effects, type2 ev) {
        if (id in effects) {
            connections[id].process(ev, id);
        }
    }

    void stateDidChange() {
        auto receivingThread = "receivingThread".locate;
        if (receivingThread != Tid.init) {
            receivingThread.send(ReceivePoke.init);
        }
    }

    void requestWasInvalid(string explanation) {
        auto receivingThread = "receivingThread".locate;
        if (receivingThread != Tid.init) {
            receivingThread.send(ReceiveInvalidRequest(explanation));
        }
    }

    ///////////////////////////////

    GC.disable();

    Effect!(float)[int] floatEffects;
    Effect!(double)[int] doubleEffects;

    Connection!(float)[int][int][int] floatConnections;
    Connection!(double)[int][int][int] doubleConnections;

    // Mixer
    float*[int] floatMixerBuffers;
    double*[int] doubleMixerBuffers;
    int[int] inputsToGo;

    // Null inputs
    immutable(float)* fzero = cast(immutable(float)*) GC.calloc(
        float.sizeof * nframes);

    immutable(double)* dzero = cast(immutable(double)*) GC.calloc(
        double.sizeof * nframes);

    bool[int] disconnected;
    RecurseGraphData!float[] queue;
    RecurseGraphData!double[] dqueue;

    int gcTimer = 0;
    string quittingThread;

    ///////////////////////////////

    try for(bool running = true; running;) {
        receive(
            (RTActivate activate) {
                if (isActive) {
                    requestWasInvalid("RTActivate called on already active thread.");
                }
                isActive = true;
            },
            (RTBeginProc beginProcCmd) {
                assert(!isInProc, "BeginProc called inside processing.");
                isInProc = true;

                beginProc!float(floatConnections, floatEffects, queue,
                    fzero, floatMixerBuffers);
                beginProc!double(doubleConnections, doubleEffects, dqueue,
                    dzero, doubleMixerBuffers);
            },
            (RTQuit quit) {
                if (!running) {
                    requestWasInvalid("Quit called twice.");
                }
                running = false;
                quittingThread = quit.dyingThread;
            },

            (RTEndProc endProc) {
                assert(isInProc, "EndProc called outside processing.");

                while(queue.length) {
                    recurseGraphContinue(floatConnections, queue,
                            floatMixerBuffers);
                }
                while(dqueue.length) {
                    recurseGraphContinue(doubleConnections, dqueue,
                            doubleMixerBuffers);
                }

                isInProc = false;

                foreach(count; inputsToGo) {
                    assert(count == 0, "Invariant: " ~ to!string(inputsToGo) ~ " is not fully empty in RTEndProc");
                }
                if (++gcTimer > 500) {
                    GC.collect();
                    gcTimer = 0;
                }
                assert((cast(Tid) endProc.requester) != Tid.init, "RTEndProc expects a requester.");
                (cast(Tid) endProc.requester).send(true);
            },

            (RTPing ping) {
                if ((cast(Tid) ping.requester) != Tid.init) {
                    requestWasInvalid("Ping expects a requester");
                    return;
                }
                if (ping.msg) {
                    (cast(Tid) ping.requester).send(true, ping.msg);
                } else {
                    (cast(Tid) ping.requester).send(true);
                }
            },

            (RTSetSampleRate sampleRateCmd) {
                if (isInProc) {
                    // defer this until after the cycle.
                    thisTid.send(sampleRateCmd);
                    return;
                }

                writeln("SetSampleRate called. This isn't yet supported.");
                enforce(sampleRateCmd.sampleRate == sampleRate);
                sampleRate = sampleRateCmd.sampleRate;

                stateDidChange();
            },

            (RTDestroyEffect destroyCmd) {
                int id = destroyCmd.effectId;
                if (isInProc) {
                    // defer this until after the cycle.
                    thisTid.send(destroyCmd);
                    return;
                }
                if (id in floatEffects) {
                    auto d = floatEffects[id];
                    delete d;
                } else if (id in doubleEffects) {
                    auto d = doubleEffects[id];
                    delete d;
                } else {
                    requestWasInvalid("Deleting a non-existant effect.");
                    return;
                }
                store.remove(id);
                stateDidChange();
            },

            (RTConnect connectCmd) {
                int id1 = connectCmd.id1;
                int id2 = connectCmd.id2;
                int fromChannel = connectCmd.fromChannel;
                int toChannel = connectCmd.toChannel;

                if (isInProc) {
                    thisTid.send(connectCmd);
                    return;
                }

                if ((id1 in doubleEffects) && (id2 in floatEffects)) {
                    requestWasInvalid("Double -> Float audio is not yet supported");
                    return;
                }
                if ((id1 in floatEffects) && (id2 in doubleEffects)) {
                    requestWasInvalid("Float -> Double audio is not yet supported");
                    return;
                }

                auto endpointsExist =
                    connect(id1, id2, fromChannel, toChannel,
                        floatConnections, floatEffects, floatMixerBuffers) ||
                    connect(id1, id2, fromChannel, toChannel,
                            doubleConnections, doubleEffects, doubleMixerBuffers);

                if (!endpointsExist) {
                    requestWasInvalid("Invalid connection: " ~ id1.to!string ~ " -> " ~ id2.to!string);
                }

                stateDidChange();
            },

            (RTDisconnect disconnectCmd) {
                int id1 = disconnectCmd.id1;
                int id2 = disconnectCmd.id2;
                int fromChannel = disconnectCmd.fromChannel;
                int toChannel = disconnectCmd.toChannel;

                if (isInProc) {
                    thisTid.send(disconnectCmd);
                    return;
                }

                disconnect(id1, id2, fromChannel, toChannel,
                    floatConnections, floatEffects, floatMixerBuffers);
                disconnect(id1, id2, fromChannel, toChannel,
                    doubleConnections, doubleEffects, doubleMixerBuffers);

                stateDidChange();
            },


            (RTCreate createCmd) {
                if (isInProc) {
                    // defer this until after the cycle.
                    thisTid.send(createCmd);
                    return;
                }

                int id = createCmd.id;
                string symbol = createCmd.symbol;
                int channels = createCmd.channels;
                AudioWidth w = createCmd.width;

                if (id in floatEffects) {
                    return;
                }
                if (id in doubleEffects) {
                    return;
                }

                auto oldIsActive = isActive;
                isActive = false;
                scope(exit) isActive = oldIsActive;

                if (w & AudioWidth.Float) {
                    create(symbol, channels, id, floatEffects,
                            floatConnections, !!(w & AudioWidth.HWIN));
                } else if (w & AudioWidth.Double) {
                    create(symbol, channels, id, doubleEffects,
                            doubleConnections, !!(w & AudioWidth.HWIN));
                }

                stateDidChange();
            },
            
            (RTAudioIn!float audioIn) {
                assert(isInProc, "RTAudioIn!float must be called during the process cycle.");

                int id = audioIn.id;
                immutable(float)* data = audioIn.data;
                int nframes = audioIn.nframes;

                assert((id in floatEffects), "Expected a valid effect in RTAudioIn!float.");

                recurseGraph!(float)(floatConnections, queue,
                        floatEffects[id], data, 0,
                        floatMixerBuffers);
            },

            (RTAudioOutPtr!float audioOut) {
                assert(!isInProc, "RTAudioOutPtr!float must be called during the process cycle.");

                int id = audioOut.id;
                shared(float)* data = audioOut.data;
                int nframes = audioOut.nframes;

                assert((id in floatEffects), "Expected a valid effect in RTAudioOutPtr!float.");

                ReceiverF rec = cast(ReceiverF) floatEffects[id];
                assert(rec, "AudioOutPtr sent to invalid destination");
                rec.deviceBuffer = data;
            },

            (RTAudioIn!double audioIn) {
                assert(isInProc, "RTAudioIn!double must be called during the process cycle.");

                int id = audioIn.id;
                immutable(double)* data = audioIn.data;
                int nframes = audioIn.nframes;

                assert((id in doubleEffects), "Expected a valid effect in RTAudioIn!double.");

                recurseGraph!(double)(doubleConnections, dqueue,
                        doubleEffects[id], data, 0,
                        doubleMixerBuffers);
            },

            (RTAudioOutPtr!double audioOut) {
                assert(!isInProc, "RTAudioOutPtr!double must be called during the process cycle.");

                int id = audioOut.id;
                shared(double)* data = audioOut.data;
                int nframes = audioOut.nframes;

                assert((id in doubleEffects), "Expected a valid effect in RTAudioOutPtr!double.");

                ReceiverD rec = cast(ReceiverD) doubleEffects[id];
                assert(rec, "AudioOutPtr sent to invalid destination");
                rec.deviceBuffer = data;
            },
            
            (RTMidiInEvent midiEventCmd) {
                if (isInProc) {
                    thisTid.send(midiEventCmd);
                    return;
                }

                int id = midiEventCmd.id;
                MidiEvent ev = midiEventCmd.ev;

                sendToEffect(id, floatEffects, ev);
                sendToEffect(id, doubleEffects, ev);
            },

            (RTMidiOutEvent midiEventCmd) {
                if (isInProc) {
                    thisTid.send(midiEventCmd);
                    return;
                }

                int id = midiEventCmd.id;
                MidiEvent ev = midiEventCmd.ev;

                sendFromEffect(id, floatConnections, floatEffects, ev);
                sendFromEffect(id, doubleConnections, doubleEffects, ev);
            },

            (RTMessageIn messageIn) {
                if (isInProc) {
                    thisTid.send(messageIn);
                    return;
                }

                int id = messageIn.id;
                string ev = messageIn.ev;

                sendToEffect(id, floatEffects, ev);
                sendToEffect(id, doubleEffects, ev);
            },

            (RTMessageOut messageOut) {
                if (isInProc) {
                    thisTid.send(messageOut);
                    return;
                }

                int id = messageOut.id;
                string ev = messageOut.ev;

                sendFromEffect(id, floatConnections, floatEffects, ev);
                sendFromEffect(id, doubleConnections, doubleEffects, ev);
            },

            (OwnerTerminated t) {
                stderr.writeln("The rtthread's owner was terminated. Cannot continue.");
                running = false;
            },

            (Variant v) {
                requestWasInvalid("Unrecognized signature " ~ v.to!string);
            }
        );
    } catch(Throwable e) {
        import std.stdio, core.runtime;
        stderr.writeln("A critical error occurred in realtime thread. Cannot continue.");
        stderr.writeln(e);
    }

    GC.enable();
    quitting = true;
    if (quittingThread) {
        quittingThread.locate().send(true);
    }
    writeln("[rtthread.d] Terminating.");
}

unittest {
    assert(cast(Effect!float) Object.factory("live.engine.rtthread.Passthrough"));
    assert(cast(Effect!float) Object.factory("live.engine.rtthread.ReceiverF"));
}
