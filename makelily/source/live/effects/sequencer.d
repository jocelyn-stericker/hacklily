/** Part of dragon. Copyright (C) Josh Netterfield <joshua@nettek.ca> 2015. */

module live.effects.sequencer;

import live.core.effect: Effect;
import live.util.files: saveAs, open_;
import live.util.track: MidiTrack, AudioTrack, AudioSecond, AudioSecondStore, secondStore;

import core.memory: GC;
import std.algorithm: min, max;
import std.container: DList;
import std.conv: to;
import std.exception: enforce;
import std.json: JSONValue, JSON_TYPE, toJSON, parseJSON;

class Sequencer : Effect!float {
    import live.core.effect;
    mixin RealtimeEffect!(Features.Dual) RTBase;

    enum State {
        Default =       0b0000000,
        Playing =       0b0000001,
        Recording =     0b0000010,
        Overdubbing =   0b0000110,
        Writeback =     0b0000100,
        Muted =         0b0001000,
        LMult =         0b0010000,
        LLooping =      0b0100000
    }

    private {
        MidiTrack m_payload;
        DList!MidiEvent m_future;
    
        AudioTrack m_audio;
        float*[] m_buffer;

        State m_state = State.Default;
        long m_pos = 0; // in frames
        long m_lastUpdatedPos = 0; // in frames

        long m_loopDuration = 0;
    }

    @property const(AudioTrack) audioTrack() {
        return m_audio;
    }

    void initialize(int dragonID, int channels, int nframes, int sampleRate) {
        RTBase.initialize(dragonID, channels, nframes, sampleRate);

        foreach (channel; 0 .. channels) {
            import std.stdio;
            m_buffer ~= cast(float*) GC.calloc(float.sizeof * nframes);
            AudioSecond[] a;
            m_audio ~= a;
        }

        if (!secondStore)
            new shared AudioSecondStore(sampleRate);

        enforce(secondStore);
        emitPosition();
    }

    void setFlag(State flag)(bool value) {
        import std.stdio;
        if (!value)
            m_state = m_state & ~flag;
        else
            m_state = m_state | flag;
        auto v = JSONValue();
        v.object["action"] = JSONValue("stateChanged");
        v.object["flag"] = JSONValue(flag == State.Writeback ? "Overdubbing" : flag.to!string());
        v.object["value"] = JSONValue();
        v.object["value"] = value ? true : false;
        toUIThread((&v).toJSON());
    }

    @property bool recording() {
        return !!(m_state & State.Recording); }
    @property void recording(bool val) {
        import std.stdio;
        setFlag!(State.Recording)(val);
        if (!val) overdubbing = false;
    }

    @property bool playing() {
        return !!(m_state & State.Playing); }
    @property void playing(bool val) {
        setFlag!(State.Playing)(val); }

    @property bool writeback() {
        return !!(m_state & State.Writeback); }

    @property bool overdubbing() {
        return recording && writeback; }
    @property void overdubbing(bool val) {
        setFlag!(State.Writeback)(val);
        if (val) recording = true;
    }

    @property bool muted() {
        return !!(m_state & State.Muted); }
    @property void muted(bool val) {
        setFlag!(State.Muted)(val); }

    @property void seek(in long pos) {
        m_pos = pos;
        m_future = m_payload.payload;
        while (recording && !m_future.empty &&
                m_future.front().time < m_pos) {
            m_future.stableRemoveFront();
        }
        emitPosition();
    }
    @property long seek() { return m_pos; }

    @property bool looping() {
        return !!(m_state & State.LLooping);
    }
    @property void looping(bool val) {
        setFlag!(State.LLooping)(val);
    }

    @property bool multiplying() {
        return !!(m_state & State.LMult);
    }
    @property void multiplying(bool val) {
        setFlag!(State.LMult)(val);
    }

    void process(immutable(float)* f,
            in int nframes, in int channel, out immutable(float)* fr) {
        import std.stdio;

        fr = f;
        // Audio
        if (looping && !multiplying && m_pos > m_loopDuration && m_pos) {
            m_pos = 0;
        }
        if (!playing) {
            fr = f;
        } else {
            uint startMod = cast(uint)(m_pos % sampleRate);
            uint startPos = cast(uint) m_pos / sampleRate; 
            uint endMod = cast(uint) (m_pos + nframes) % sampleRate;
            uint endPos = cast(uint) (m_pos + nframes) / sampleRate;

            uint length1 = min(startMod + nframes, sampleRate) - startMod;

            if (recording) {
                foreach(uint pos; [startPos, endPos]) {
                    while(m_audio[channel].length <= pos) {
                        m_audio[channel] ~= null;
                    }
                    if (!m_audio[channel][pos]) {
                        m_audio[channel][pos] = secondStore.get();
                    }
                }
            }

            if (overdubbing && (!multiplying || !m_loopDuration || m_loopDuration == m_pos)) {
                assert(recording);
                m_audio[channel][startPos].
                    payload[startMod..startMod+length1] += f[0..length1];
                m_buffer[channel][0..length1] = m_audio[channel][startPos].
                    payload[startMod..startMod+length1];

                if (startPos != endPos) {
                    m_audio[channel][endPos].
                        payload[0..endMod] += f[length1..nframes];
                    m_buffer[channel][length1..nframes] = m_audio[channel]
                        [endPos].payload[0..endMod];
                }
            } else if (multiplying) {
            } else if (recording /* and not overdubbing*/) {
                m_buffer[channel][0..length1] = m_audio[channel][startPos].
                    payload[startMod..startMod+length1] + f[0..length1];
                m_audio[channel][startPos].
                    payload[startMod..startMod+length1] = f[0..length1];
                // STOPSHIP

                if (startPos != endPos) {
                    m_buffer[channel][length1..nframes] = m_audio[channel]
                        [endPos].payload[0..endMod] + f[length1..nframes];
                    m_audio[channel][endPos].
                        payload[0..endMod] = f[length1..nframes];
                }
                import std.stdio;
            } else { /* not recording */
                if (m_audio[channel].length > startPos && m_audio[channel][startPos]) {
                    m_buffer[channel][0..length1] = m_audio[channel][startPos].
                        payload[startMod..startMod+length1] + f[0..length1];
                } else {
                    m_buffer[channel][0..length1] = f[0..length1];
                }

                if (startPos != endPos) {
                    if (m_audio[channel].length > endPos && m_audio[channel][endPos]) {
                        m_buffer[channel][length1..nframes] = m_audio[channel][endPos].
                            payload[0..endMod] + f[length1..nframes];
                    } else {
                        m_buffer[channel][length1..nframes] = f[length1..nframes];
                    }
                }
            }

            if (channel == 1) {
                m_pos += nframes;
                if (m_lastUpdatedPos > m_pos ||
                        m_lastUpdatedPos + sampleRate/5 <= m_pos) {
                    emitPosition();
                }
                updateClient(m_pos - nframes, m_pos);
            }

            fr = cast(immutable float*) m_buffer[channel];
            // DON'T TOUCH m_buffer BELOW THIS LINE.
        }

        // Midi
        while (recording && !m_future.empty &&
                m_future.front().time < m_pos) {
            MidiEvent a = m_future.front();
            a.time = 0;
            emit(a);
            m_future.stableRemoveFront();
        }
    }

    void process(MidiEvent ev) {
        if (recording) {
            ev.time = m_pos;
            m_payload.insert(ev);
        }
        emit(ev);
    }

    ulong clientWidth = 0;
    ulong clientEnd = 0;
    float[] clientData = null;

    void updateClient(ulong pStart, ulong pEnd) {
        import live.util.track: dragon_waveform_getEndFrame, dragon_waveform_getWidth,
               dragon_waveform_setData;

        int end = dragonID.dragon_waveform_getEndFrame();
        int width = dragonID.dragon_waveform_getWidth();
        if (end <= 0 || width <= 0) {
            return;
        }
        if (width != clientWidth || end != clientEnd) {
            clientData = new float[width];
            clientWidth = width;
            clientEnd = end;
            clientData[0..width] = 0.0;
        }

        float tmp = cast(float)(width) / cast(float)(end);
        if (pEnd > end) {
            pEnd = end;
        }

        ulong firstI = max(0, (cast(ulong) ((cast(float) pStart) / tmp - 0.5)));
        ulong lastI = min(width, cast(ulong) ((cast(float) pEnd) / tmp + 0.5));
        if (firstI > lastI) {
            firstI = lastI;
        }

        float[] curr = null;
        ulong curry = -1;
        for (uint i = cast(uint) pStart; i < pEnd; ++i) {
            int xidx = (cast(int) ((cast(float)i) * tmp));
            immutable float a = clientData[xidx];
            if (m_audio[0].length <= i / sampleRate) return;
            if (i / sampleRate != curry) {
                curr = m_audio[0][i / sampleRate].payload;
                curry = i / sampleRate;
            }
            float t = curr[i % sampleRate];
            if (a * a < t * t) {
                clientData[xidx] = t;
            }
        }
        dragonID.dragon_waveform_setData(&clientData[0], width);
    }

    void emitPosition() {
        m_lastUpdatedPos = m_pos;
        auto v = JSONValue();
        v.object["action"] = JSONValue("posChanged");
        v.object["pos"] = JSONValue();
        v.object["pos"].integer = m_pos;
        v.object["sampleRate"] = JSONValue();
        v.object["sampleRate"].integer = sampleRate;
        toUIThread((&v).toJSON());
    }

    void process(string data) {
        import std.stdio;
        try {
            auto root = data.parseJSON();
            enforce(root.type == JSON_TYPE.OBJECT, "Not a JSON object, " ~ data);
            enforce("action" in root.object);
            enforce(root["action"].type == JSON_TYPE.STRING);

            if (root["action"].str == "seek") {
                writeln("==seek==");
                enforce("pos" in root.object);
                enforce(root["pos"].type == JSON_TYPE.INTEGER);
                seek = root["pos"].integer;
                return;
            }

            if (root["action"].str == "save") {
                enforce("filename" in root.object);
                enforce(root["filename"].type == JSON_TYPE.STRING);
                m_audio.saveAs(root["filename"].str);
            }

            if (root["action"].str == "open") {
                enforce("filename" in root.object);
                enforce(root["filename"].type == JSON_TYPE.STRING);
                m_audio.open_(root["filename"].str);
                updateClient(0, max(m_audio[0].length, m_audio[1].length) * sampleRate);
            }

            void sync(string s)() {
                enforce(s.length);
                if (root["action"].str == "set" ~ s[0..1].toUpper() ~ s[1..s.length]) {
                    enforce(s in root.object);
                    enforce(root[s].type == JSON_TYPE.TRUE || JSON_TYPE.FALSE);
                    mixin(s) = root[s].type == JSON_TYPE.TRUE;
                }
            }
            sync!("recording")();
            sync!("playing")();
            sync!("muted")();
            sync!("overdubbing")();
        } catch(Throwable e) {
            writeln("oops.", e);
            auto v = JSONValue();
            v["action"] = JSONValue("exception");
            v["exception"] = JSONValue(e.to!string());
            toUIThread((&v).toJSON());
        }
    }

    this() {
        m_future = m_payload.payload;
    }
}

