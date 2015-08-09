/** Part of dragon. Copyright (C) Josh Netterfield <joshua@nettek.ca> 2015. */

module live.engine.rtcommands;

import std.concurrency: Tid;

import live.core.effect: AudioWidth;
import live.core.event: MidiEvent;

export struct RTActivate {
}

export struct RTBeginProc {
}

export struct RTQuit {
    /**
     * Optional. If specified, the value 'true' will be sent once the thread
     * has terminated.
     */
    string dyingThread;
}

export struct RTEndProc {
    shared(Tid) requester;
}

export struct RTPing {
    shared(Tid) requester;
    /**
     * Optional second value to send. Else, responds with the value 'true'.
     */
    string msg;
}

export struct RTSetSampleRate {
    int sampleRate;
}

export struct RTDestroyEffect {
    int effectId;
}

export struct RTConnect {
    int id1;
    int id2;
    int fromChannel;
    int toChannel;
}

export struct RTDisconnect {
    int id1;
    int id2;
    int fromChannel;
    int toChannel;
}

export struct RTCreate {
    int id;
    string symbol;
    int channels;
    AudioWidth width;
}

export struct RTAudioIn(T) {
    int id;
    immutable(T)* data;
    int nframes;
}

export struct RTAudioOutPtr(T) {
    int id;
    shared(T)* data;
    int nframes;
}

export struct RTMidiInEvent {
    int id;
    MidiEvent ev;
}

export struct RTMidiOutEvent {
    int id;
    MidiEvent ev;
}

export struct RTMessageIn {
    int id;
    string ev;
}

export struct RTMessageOut {
    int id;
    string ev;
}
