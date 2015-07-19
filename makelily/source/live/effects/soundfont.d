/** Part of dragon. Copyright (C) Josh Netterfield <joshua@nettek.ca> 2015. */

module live.effects.soundfont;

import core.memory: GC;
import deimos.fluidsynth:
       fluid_settings_t, fluid_synth_t, new_fluid_synth, new_fluid_settings,
       fluid_settings_setnum, fluid_synth_write_float, fluid_synth_noteoff, fluid_synth_noteon,
       fluid_synth_cc, fluid_synth_channel_pressure, new_fluid_synth, fluid_synth_pitch_bend,
       fluid_synth_sfload, fluid_synth_program_change;
import std.conv: to;
import std.exception: enforce;
import std.json: JSONValue, toJSON, parseJSON, JSON_TYPE;

import live.core.effect;
import live.core.event;

class Soundfont : Effect!float {
    mixin RealtimeEffect!(Features.Dual) RTBase;

    private fluid_settings_t* m_settings;
    private fluid_synth_t* m_synth;
    private float*[] m_buffer;
    private bool m_loaded = false;
    private int m_remaining = -1;

    void initialize(int dragonID, int channels, int nframes, int sampleRate) {
        RTBase.initialize(dragonID, channels, nframes, sampleRate);

        foreach (channel; 0 .. channels) {
            m_buffer ~= cast(float*) GC.calloc(float.sizeof * nframes);
        }
        import std.stdio;

        m_settings = new_fluid_settings();
        fluid_settings_setnum(m_settings, "synth.sample-rate", sampleRate);
        fluid_settings_setnum(m_settings, "synth.gain", 1.0);
        m_synth = new_fluid_synth(m_settings);
        m_remaining = 0;
    }

    void process(immutable(float)* fin,
        in int nframes, in int channel, out immutable(float)* fout) {

        if (!m_loaded) {
            fout = fin;
            return;
        }

        enforce(channel >= 0 && channel <= channels);
        enforce(m_remaining >= 0 && m_remaining <= channels);

        if (!m_remaining) {
            m_synth.fluid_synth_write_float(nframes,
                m_buffer[0], 0, 1,
                 m_buffer[1], 0, 1);
            m_remaining = channels - 1;
        } else {
            --m_remaining;
        }

        fout = cast(immutable(float)*) m_buffer[channel];
    }

    void process(MidiEvent e) {
        final switch(e.type) {
            case MidiEventType.NOTE_OFF:
                m_synth.fluid_synth_noteoff(e.channel, e.note);
                break;
            case MidiEventType.NOTE_ON:
                m_synth.fluid_synth_noteon(e.channel, e.note, e.velocity);
                break;
            case MidiEventType.POLYPHONIC_AFTERTOUCH:
                import std.stdio;
                writeln("Ignoring polyphonic aftertouch.");
                break; 
            case MidiEventType.CONTROL_CHANGE:
                m_synth.fluid_synth_cc(e.channel, e.controller, e.controllerValue);
                break; 
            case MidiEventType.PROGRAM_CHANGE:
                setProgram(e.channel, e.program);
                break; 
            case MidiEventType.CHANNEL_AFTERTOUCH:
                m_synth.fluid_synth_channel_pressure(e.channel, e.velocity);
                break; 
            case MidiEventType.PITCH_WHEEL:
                fluid_synth_pitch_bend(m_synth, e.channel, e.pitchWheel);
                break; 
            case MidiEventType.SYSEX:
                import std.stdio;
                writeln("Ignoring sysex.");
                break; 
        }
    }
    void process(string data) {
        import std.stdio;
        try {
            auto root = data.parseJSON();
            enforce(root.type == JSON_TYPE.OBJECT, "Not a JSON object, " ~ data);
            enforce("action" in root.object);
            enforce(root["action"].type == JSON_TYPE.STRING);

            if (root["action"].str == "loadSoundfont") {
                enforce("url" in root.object);
                enforce(root["url"].type == JSON_TYPE.STRING);

                fluid_synth_sfload(m_synth, root["url"].str.toStringz(), 1);
                m_loaded = true;
            }

            if (root["action"].str == "setProgram") {
                enforce("channel" in root.object);
                enforce("program" in root.object);
                enforce(root["channel"].type == JSON_TYPE.INTEGER);
                enforce(root["program"].type == JSON_TYPE.INTEGER);

                setProgram(cast(int) root["channel"].integer,
                        cast(int) root["program"].integer);
            }
        } catch(Exception e) {
            writeln("oops.", e);
            auto v = JSONValue();
            v["action"] = JSONValue("exception");
            v["exception"] = JSONValue(e.to!string());
            toUIThread((&v).toJSON());
        }
    }

    void setProgram(int channel, int program) {
        import std.stdio;
        writeln("setprogram", channel, program);
        m_synth.fluid_synth_program_change(channel, program);
        auto v = JSONValue();
        JSONValue[string] t;
        v.object = t;
        v.object["action"] = JSONValue("programChange");
        v.object["channel"] = JSONValue(channel.to!string());
        v.object["program"] = JSONValue(program.to!string());
        toUIThread((&v).toJSON());
    }
};

unittest {
    assert(cast(Effect!float) Object.factory("live.effects.soundfont.Soundfont"));
}
