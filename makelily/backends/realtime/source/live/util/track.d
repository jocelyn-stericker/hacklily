/** Part of dragon. Copyright (C) Josh Netterfield <joshua@nettek.ca> 2015. */

module live.util.track;

import std.array: empty, back;
import std.concurrency: spawn, thisTid, send, receive, register, locate, Tid, OwnerTerminated;
import std.container: DList;

import live.core.event: MidiEvent;

// waveform
extern(C) {
    int dragon_waveform_getStartFrame(int id);
    int dragon_waveform_getEndFrame(int id);
    int dragon_waveform_getWidth(int id);
    void dragon_waveform_setData(int id, float* data, int frames);
    bool dragon_dirty(int id);
}

struct MidiTrack {
    private DList!MidiEvent m_payload;
    @property ref DList!MidiEvent payload() { return m_payload; }
    alias this payload;
    void insert(MidiEvent t) {
        for (auto it = payload[]; !it.empty; it.popFront()) {
            if (t.time < it.front().time) {
                m_payload.stableInsertBefore(it, t);
                return;
            }
        }
        m_payload.stableInsertBack(t);
    }
};

class AudioSecond {
    private float[] m_data;
    @disable private this() {}
    this(uint sampleRate) {
        m_data.length = sampleRate;
        m_data[0..$] = 0.0;
    }
    @property ref float[] payload() { return m_data; }
    alias this payload;
};

synchronized class AudioSecondStore {
    private AudioSecond[] m_bag;
    uint sampleRate;
    AudioSecond get() {
        if (!m_bag.empty) {
            auto ret = m_bag.back();
            m_bag = m_bag[0..m_bag.length - 2];
            locate("storeThread").send(true);
            return cast(AudioSecond) ret;
        } else {
            return null;
        }
    }
    this(uint rate) {
        sampleRate = rate;
        import std.stdio;
        if (secondStore) return;
        secondStore = this;
        spawn(&storeThread);
    }
    private void fill() {
        while(AudioSecondStore.m_bag.length < 20) {
            import std.stdio;
            AudioSecondStore.m_bag ~= new AudioSecond(sampleRate);
        }
    }
}

shared AudioSecondStore secondStore;

void storeThread() {
    secondStore.fill();
    register("storeThread", thisTid);
    try for(bool running = true; running;) {
        import std.stdio;
        receive(
            (bool) {
                secondStore.fill();
            },
            (OwnerTerminated t) {
                running = false;
            }
        );
    } catch(Error e) {
        import std.stdio, core.runtime;
        stderr.writeln("A critial error in audio store. Things will probably crash soon.");
        stderr.writeln(e);
    }
}

alias AudioTrack = AudioSecond[][];
