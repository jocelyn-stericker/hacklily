/** Part of dragon. Copyright (C) Josh Netterfield <joshua@nettek.ca> 2015. */

module live.engine.rtthread;

import core.memory: GC;
import std.array: popFront;
import std.concurrency: thisTid, receive, send, OwnerTerminated, Tid;
import std.conv: to;
import std.exception: enforce;
import std.variant: Variant;

import live.core.effect: AudioWidth, Effect, RTCommand, rtThread_effect;
import live.core.event: MidiEvent;
import live.core.store: Store;

shared bool isActive = false;

class Passthrough : Effect!float {
    import live.core.effect;
    mixin RealtimeEffect!(Features.Dual);

    void process(immutable(float)* f,
            in int nframes, in int channel, out immutable(float)* fr) {
        fr = f;
    }

    void process(MidiEvent ev) {
        emit(ev); }

    void process(string v) {
        emit(v); }
}

class ReceiverG(type) : Effect!type {
    import live.core.effect;
    mixin RealtimeEffect!(Features.Audio);

    shared(type*) buffer = null;

    void process(immutable(type)* f,
            in int nframes, in int channel, out immutable(type)* fr) {
        if (buffer) {
            import std.stdio;
            buffer[0..nframes] = f[0..nframes];
        }
        fr = f;
    }

    void process(MidiEvent ev) { emit(ev); }
    void process(string v) { emit(v); }
}

class Receiver : ReceiverG!float {}
class ReceiverD : ReceiverG!double {}

shared bool quitting = false;

private class Connection(audiotype) {
    Effect!audiotype b;
    int startChannel, endChannel;
    int channelOffset;
    this(Effect!audiotype other, int start, int end, int offset) {
        b = other;
        startChannel = start;
        endChannel = end;
        channelOffset = offset;
        this();
    }
    this() {
        if (startChannel != -1)
                foreach (i; startChannel..endChannel + 1) { 
            b.inputs[i] = b.inputs.get(i, 0) + 1;
        }
    }
    ~this() {
        if (quitting) {
            return;
        }
        if (startChannel != -1)
                foreach (i; startChannel..endChannel + 1) { 
            b.inputs[i] = b.inputs.get(i, 0) - 1;
        }
        startChannel = -1;
    }
}

public int sender = -1;

void process(audioType, otherType)(Connection!(audioType)[][int] connection, otherType ev, int from) {
    foreach (cl; connection) {
        if (cl.length) {
            auto c = cl[0];

            auto senderBk = sender;
            scope(exit) sender = senderBk;
            sender = from;

            c.b.process(ev);
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

    void recurseGraph(type)(Connection!(type)[][int][int] connections,
            ref RecurseGraphData!type[] queue, Effect!type effect,
            immutable(type)* inData, int chan, type*[int] mixerBuffer) {

        immutable(type)* buffer;

        effect.process(inData, nframes, chan, buffer);
        queue ~= RecurseGraphData!type(effect, chan, buffer);
    }

    void recurseGraphContinue(type)(Connection!(type)[][int][int] connections,
            ref RecurseGraphData!type[] queue, type*[int] mixerBuffer) {

        assert(queue.length);
        RecurseGraphData!type t = queue[0];
        queue.popFront();

        auto effect = t.effect;
        auto chan = t.chan;
        auto buffer = t.buffer;

        foreach (conl; connections[effect.dragonID]) {
            foreach (con; conl) {
                auto senderBk = sender;
                scope(exit) sender = senderBk;
                sender = effect.dragonID;

                if (con.startChannel == -1 ||
                        chan + con.channelOffset < con.startChannel ||
                        chan + con.channelOffset > con.endChannel)
                    continue;

                int iID = con.b.dragonID;
                int ichan = chan + con.channelOffset;
                auto iInputs = con.b.inputs;

                if (iInputs[ichan] == 1) {
                    recurseGraph(connections, queue, con.b, buffer,
                            ichan, mixerBuffer);
                } else {
                    assert(iInputs[ichan] > 1);
                    int code = iID * 10000 + ichan;

                    type* buffer2 = mixerBuffer[code];
                    buffer2[0..nframes] += buffer[0..nframes];
                    --inputsToGo[code];
                    if (!inputsToGo[code]) {
                        recurseGraph(connections, queue, con.b,
                                cast(immutable(type)*) buffer2,
                                ichan, mixerBuffer);
                    }
                }
            }
        }
    }

    void beginProc(type)(Connection!(type)[][int][int] connections,
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
                assert(exists);
                int id = code / 10000;
                int chan = code % 10000;
                if (!(id in effects)) continue;
                recurseGraph(connections, queue, effects[id], zero, chan,
                        mixerBuffer);
            }
    }

    void disconnect(type)(int id1, int id2,
            Connection!(type)[][int][int] connections,
            Effect!(type)[int] effects,
            type*[int] mixerBuffers) {
        if ((id1 in connections) && (id2 in connections[id1])) {
            destroy(connections[id1][id2]);
            connections[id1].remove(id2);
            foreach (channel, count; effects[id2].inputs) {
                if (count == 1) {
                    mixerBuffers.remove(id2*10000 + channel);
                    inputsToGo.remove(id2*10000 + channel);
                } else if (count == 0) {
                    disconnected[id2*10000 + channel] = true;
                }
            }
        } 
    }

    void connect(type)(int id1, int id2, int start, int end, int offset,
            ref Connection!(type)[][int][int] connections,
            ref Effect!(type)[int] effects,
            ref type*[int] mixerBuffers) {

        if ((id1 in effects) && (id2 in effects)) {
            connections[id1][id2] ~= 
                new Connection!type(effects[id2], start, end, -offset);

            foreach (channel, count; effects[id2].inputs) {
                if (count == 1) {
                    disconnected.remove(id2*10000 + channel);
                } else if (count == 2) {
                    mixerBuffers[id2*10000 + channel] = cast(type*) GC.calloc(
                        type.sizeof * nframes);
                    inputsToGo[id2*10000 + channel] = count;
                }
            }
        }
    }
    
    void create(type)(string symbol, int channels, int dragonID,
            ref Effect!(type)[int] effects,
            ref Connection!(type)[][int][int] cons, bool hardware) {
        effects[dragonID] = cast(Effect!type) Object.factory(symbol);
        effects[dragonID].initialize(dragonID, channels, nframes, sampleRate);
        cons[dragonID] = null;
        if(!hardware) foreach (channel; 0..channels) {
            disconnected[dragonID*10000 + channel] = true;
        }
    }

    void sendToEffect(type1, type2)
            (int dragonID, Effect!(type1)[int] effects, type2 ev) {
        if (dragonID in effects) {
            effects[dragonID].process(ev);
        }
    }

    void sendFromEffect(type1, type2)(int dragonID,
            Connection!(type1)[][int][int] connections,
            Effect!(type1)[int] effects, type2 ev) {
        if (dragonID in effects) {
            connections[dragonID].process(ev, dragonID);
        }
    }

    ///////////////////////////////

    GC.disable();

    Effect!(float)[int] floatEffects;
    Effect!(double)[int] doubleEffects;

    Connection!(float)[][int][int] floatConnections;
    Connection!(double)[][int][int] doubleConnections;

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

    ///////////////////////////////

    try for(bool running = true; running;) {
        receive(
            // .BeginProc, .Quit
            (RTCommand command) {
                switch(command) {
                case RTCommand.Activate:
                    isActive = true;
                    break;
                case RTCommand.BeginProc:
                    assert(!isInProc, "BeginProc called inside processing.");
                    isInProc = true;

                    beginProc!float(floatConnections, floatEffects, queue,
                        fzero, floatMixerBuffers);
                    beginProc!double(doubleConnections, doubleEffects, dqueue,
                        dzero, doubleMixerBuffers);
                    break;
                case RTCommand.Quit:
                    running = false;
                    break;
                default:
                    assert(0, "Invalid signature");
                }
            },

            // .EndProc, .Ping
            (RTCommand command, Tid tid) {
                switch (command) {
                case RTCommand.EndProc:
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
                        assert(count == 0, "Invariant: " ~ to!string(inputsToGo) ~ " is not fully empty at RTCommand.EndProc");
                    }
                    if (++gcTimer > 500) {
                        GC.collect();
                        gcTimer = 0;
                    }
                    tid.send(true);
                    break;
                case RTCommand.Ping:
                    tid.send(true);
                    break;
                default:
                    assert(0, "Invalid signature");
                }
            },

            // .Ping
            (RTCommand command, Tid tid, string msg) {
                switch (command) {
                case RTCommand.Ping:
                    tid.send(true, msg);
                    break;
                default:
                    assert(0, "Invalid signature");
                }
            },

            // .SetSampleRate, .Destroy
            (RTCommand command, int i) {
                switch(command) {
                case RTCommand.SetSampleRate:
                    writeln("SetSampleRate called. This isn't yet supported.");
                    enforce(sampleRate == i);
                    sampleRate = i;
                    break;
                case RTCommand.Destroy: {
                    int dragonID = i;
                    if (isInProc) {
                        // defer this until after the cycle.
                        thisTid.send(command, dragonID);
                        return;
                    }
                    if (dragonID in floatEffects) {
                        auto d = floatEffects[dragonID];
                        delete d;
                    } else if (dragonID in doubleEffects) {
                        auto d = doubleEffects[dragonID];
                        delete d;
                    } else {
                        assert(0, "Deleting a non-existant effect.");
                    }
                    store.remove(dragonID);
                    break;
                }
                default:
                    assert(0, "Invalid signature");
                }
            },

            // .Connect
            (RTCommand command, int id1, int id2, int start, int end, int chOffset) {
                if (isInProc) {
                    thisTid.send(command, id1, id2, start, end, chOffset);
                }

                if (command == RTCommand.Disconnect) {
                    disconnect(id1, id2, floatConnections, floatEffects,
                        floatMixerBuffers);
                    disconnect(id1, id2, doubleConnections, doubleEffects,
                        doubleMixerBuffers);
                    return;
                } else if (command != RTCommand.Connect) {
                    return;
                }

                connect(id1, id2, start, end, chOffset,
                        floatConnections, floatEffects, floatMixerBuffers);
                connect(id1, id2, start, end, chOffset,
                        doubleConnections, doubleEffects, doubleMixerBuffers);
                if ((id1 in doubleEffects) && (id2 in floatEffects)) {
                    assert(0, "Double -> Float audio is not yet supported");
                }
                if ((id1 in floatEffects) && (id2 in doubleEffects)) {
                    assert(0, "Float -> Double audio is not yet supported");
                }
            },
            
            // Create
            (RTCommand command, int dragonID, string symbol, int channels,
                    AudioWidth w) {

                if (isInProc) {
                    // defer this until after the cycle.
                    thisTid.send(command, dragonID, symbol, channels, w);
                    return;
                }

                if (command != RTCommand.Create) {
                    return;
                }
                if (dragonID in floatEffects) {
                    return;
                }
                if (dragonID in doubleEffects) {
                    return;
                }

                isActive = false;
                scope(exit) isActive = true;

                if (w & AudioWidth.Float) {
                    create(symbol, channels, dragonID, floatEffects,
                            floatConnections, !!(w & AudioWidth.HWIN));
                } else if (w & AudioWidth.Double) {
                    create(symbol, channels, dragonID, doubleEffects,
                            doubleConnections, !!(w & AudioWidth.HWIN));
                }
            },
            
            // Hardware Audio In - float
            (RTCommand command, int dragonID, immutable(float)* data, int nframes) {
                assert(isInProc, "AudioIn is a low level function which is " ~
                        "called during the process cycle");

                if ((dragonID in floatEffects) && command == RTCommand.AudioIn) {
                    recurseGraph!(float)(floatConnections, queue,
                            floatEffects[dragonID], data, 0,
                            floatMixerBuffers);
                }
            },
            (RTCommand command, int dragonID, shared(float)* data, int nframes) {
                assert(!isInProc);

                if ((dragonID in floatEffects) &&
                    command == RTCommand.AudioOutPtr) {
                    Receiver rec = cast(Receiver) floatEffects[dragonID];
                    assert(rec, "AudioOutPtr sent to invalid destination");
                    rec.buffer = data;
                }
            },
            
            // Hardware Audio In - double
            (RTCommand audioIn, int dragonID, immutable(double)* data, int nframes) {
                assert(isInProc, "AudioOutPtr is a low level function which " ~
                        "is called during the process cycle");
                if ((dragonID in doubleEffects) && audioIn == RTCommand.AudioIn) {
                    recurseGraph!(double)(doubleConnections, dqueue,
                            doubleEffects[dragonID], data, 0,
                            doubleMixerBuffers);
                }
            },

            (RTCommand command, int dragonID, shared(double)* data, int nframes) {
                assert(isInProc, "AudioOutPtr is a low level function which " ~
                        "is called during the process cycle");

                if ((dragonID in doubleEffects) &&
                    command == RTCommand.AudioOutPtr) {
                    ReceiverD rec = cast(ReceiverD) doubleEffects[dragonID];
                    assert(rec, "AudioOutPtr sent to invalid destination");
                    rec.buffer = data;
                }
            },
            
            // Midi I/O
            (RTCommand midi, int dragonID, MidiEvent ev) {
                if (isInProc) {
                    thisTid.send(midi, dragonID, ev);
                    return;
                }

                if (midi == RTCommand.MidiIn) {
                    sendToEffect(dragonID, floatEffects, ev);
                    sendToEffect(dragonID, doubleEffects, ev);
                } else if (midi == RTCommand.MidiOut) {
                    sendFromEffect(dragonID, floatConnections, floatEffects, ev);
                    sendFromEffect(dragonID, doubleConnections, doubleEffects, ev);
                }
            },
            
            // Message I/O
            (RTCommand command, int dragonID, string ev) {
                if (isInProc) {
                    thisTid.send(command, dragonID, ev);
                    return;
                }

                if (command == RTCommand.MessageIn) {
                    sendToEffect(dragonID, floatEffects, ev);
                    sendToEffect(dragonID, doubleEffects, ev);
                } else if (command == RTCommand.MessageOut) {
                    sendFromEffect(dragonID, floatConnections, floatEffects, ev);
                    sendFromEffect(dragonID, doubleConnections, doubleEffects, ev);
                }
            },

            // Testing and Exceptions
            (OwnerTerminated t) {
                running = false;
            },

            (Variant v) {
                import std.stdio;
                writeln("Signature: ", v);
                assert(0, "Unrecognized signature");
            }
        );
    } catch(Throwable e) {
        import std.stdio, core.runtime;
        stderr.writeln("A critical error occurred in realtime thread. Cannot continue.");
        stderr.writeln(e);
    }

    GC.enable();
    quitting = true;
}

unittest {
    assert(cast(Effect!float) Object.factory("live.engine.rtthread.Passthrough"));
    assert(cast(Effect!float) Object.factory("live.engine.rtthread.Receiver"));
}
