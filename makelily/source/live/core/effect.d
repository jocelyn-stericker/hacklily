/** Part of dragon. Copyright (C) Josh Netterfield <joshua@nettek.ca> 2015. */

module live.core.effect;

import std.concurrency: Tid;

import live.core.event: MidiEvent;
import live.util.assignOnce: AssignOnce;

public enum Features {
    Dummy = 2_00,
    Midi = 2_01,
    Audio = 2_10,
    Dual = 2_11
}

public enum AudioWidth: int {
    Dummy = 0b000,
    Float = 0b001,
    FloatHWIN = 0b101,
    Double = 0b010,
    DoubleHWIN = 0b110,
    HWIN = 0b100,
    Any = 0b1000
}

public enum Connectivity {
    None = 0b00,
    Input = 0b01,
    Output = 0b10,
    Effect = 0b11,
    Any = 0b100
}

public mixin template RealtimeEffect(Features f) {
    import std.concurrency;
    import std.string;
    private AssignOnce!int m_id;
    private AssignOnce!int m_channels;
    private AssignOnce!int m_sampleRate;
    int[int] m_inputs;

    void initialize(int id, int channels, int nframes, int sampleRate) {
        assert(m_id == -1);
        assert(m_channels == -1);
        m_id = id;
        m_channels = channels;
        m_sampleRate = sampleRate;
    }

    @property pure nothrow int channels() const {
        return m_channels;
    }

    @property pure nothrow int id() const {
        return m_id;
    }

    @property pure nothrow int sampleRate() const {
        return m_sampleRate;
    }

    @property pure nothrow Features features() const {
        return f;
    }

    @property ref int[int] inputs() {
        return m_inputs;
    }

    void emit(MidiEvent ev) {
        rtThread_effect.send(RTCommand.MidiOut, id, ev);
    }

    void emit(string str) {
        rtThread_effect.send(RTCommand.MessageOut, id, str);
    }

    void toUIThread(immutable string str) {
        dragon_sendToUIThread(id, str.toStringz());
    }

    invariant() {
        assert(thisTid == rtThread_effect);
    }
}

public enum RTCommand {
    Connect = 0,    /* id1, id2, channelOffset */
    Disconnect = 1, /* id1, id2 */
    BeginProc = 2,  /* called before any AudioIn */
    EndProc = 3,    /* called after all AudioIn */
                    /* garbage collection happens here*/
    Create,         /* id creatable, string factory */
    Destroy,        /* id active */
    AudioIn,        /* id to, <float|double>* data, nframes */
    AudioOutPtr,    /* id from, <float|double>* bufferPtr, nframes */
    MidiIn,         /* id to, MidiEvent */
    MidiOut,        /* id from, MidiEvent */
    MessageIn,      /* id to, string */
    MessageOut,     /* id from, string */
    SetSampleRate,  /* sampleRate */

    Ping,           /* TId */

    Activate,
    Quit
};

public Tid rtThread_effect;
public extern(C) void dragon_sendToUIThread(int id, const char* msg);

public interface Effect(audiotype) {
    void process(immutable(audiotype)* f,
        in int nframes, in int channel, out immutable(audiotype)*);

    void process(MidiEvent);
    void process(string);

    void initialize(int id, int channels, int nframes, int sampleRate);

    @property pure nothrow int channels() const;
    @property pure nothrow int id() const;
    @property pure nothrow Features features() const;

    @property ref int[int] inputs();
};
