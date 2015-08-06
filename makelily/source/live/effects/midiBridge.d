/** Part of dragon. Copyright (C) Josh Netterfield <joshua@nettek.ca> 2015. */

module live.effects.midiBridge;

import core.memory: GC;
import std.conv: to;
import std.exception: enforce;
import std.json: JSONValue, toJSON, parseJSON, JSON_TYPE;

import live.core.effect;
import live.core.event;

class MidiBridge : Effect!float {
    mixin RealtimeEffect!(Features.Dual) RTBase;

    void process(immutable(float)* fin,
        in int nframes, in int channel, out immutable(float)* fout) {

        fout = fin;
    }

    void process(MidiEvent e) {
        auto json = JSONValue();
        final switch(e.type) {
            case MidiEventType.NOTE_OFF:
                json["type"] = JSONValue("NOTE_OFF");
                json["channel"] = JSONValue(e.channel);
                json["note"] = JSONValue(e.note);
                break;
            case MidiEventType.NOTE_ON:
                json["type"] = JSONValue("NOTE_ON");
                json["channel"] = JSONValue(e.channel);
                json["note"] = JSONValue(e.note);
                json["velocity"] = JSONValue(e.velocity);
                break;
            case MidiEventType.POLYPHONIC_AFTERTOUCH:
                json["type"] = JSONValue("POLYPHONIC_AFTERTOUCH");
                json["channel"] = JSONValue(e.channel);
                json["note"] = JSONValue(e.note);
                json["velocity"] = JSONValue(e.velocity);
                break; 
            case MidiEventType.CONTROL_CHANGE:
                json["type"] = JSONValue("CONTROL_CHANGE");
                json["channel"] = JSONValue(e.channel);
                json["controller"] = JSONValue(e.controller);
                json["controllerValue"] = JSONValue(e.controllerValue);
                break; 
            case MidiEventType.PROGRAM_CHANGE:
                json["type"] = JSONValue("PROGRAM_CHANGE");
                json["channel"] = JSONValue(e.channel);
                json["program"] = JSONValue(e.program);
                break; 
            case MidiEventType.CHANNEL_AFTERTOUCH:
                json["type"] = JSONValue("CHANNEL_AFTERTOUCH");
                json["channel"] = JSONValue(e.channel);
                json["velocity"] = JSONValue(e.velocity);
                break; 
            case MidiEventType.PITCH_WHEEL:
                json["type"] = JSONValue("PITCH_WHEEL");
                json["channel"] = JSONValue(e.channel);
                json["pitchWheel"] = JSONValue(e.pitchWheel);
                break; 
            case MidiEventType.SYSEX:
                import std.stdio;
                writeln("Ignoring sysex.");
                return;
        }
        toUIThread(json);
    }

    void process(string data) {
        import std.stdio;
        try {
            auto root = data.parseJSON();
            enforce(root.type == JSON_TYPE.OBJECT, "Not a JSON object, " ~ data);

            if ("event" in root) {
                auto event = root["event"].object;
                auto type = event["type"].str;
                if (type == "NOTE_OFF") {
                    auto channel = event["channel"].integer.to!ubyte;
                    auto note = event["note"].integer.to!ubyte;
                    MidiEvent ev = MidiEvent(
                        (0x80 + (channel - 1)).to!ubyte,
                        note,
                        0.to!ubyte
                    );
                    emit(ev);
                } else if (type == "NOTE_ON") {
                    auto channel = event["channel"].integer.to!ubyte;
                    auto note = event["note"].integer.to!ubyte;
                    auto velocity = event["velocity"].integer.to!ubyte;
                    MidiEvent ev = MidiEvent(
                        (0x90 + (channel - 1)).to!ubyte,
                        note,
                        velocity
                    );
                    emit(ev);
                }
            }
        } catch(Exception e) {
            writeln("oops.", e);
            auto v = JSONValue();
            v["action"] = JSONValue("exception");
            v["exception"] = JSONValue(e.to!string());
            toUIThread(v);
        }
    }
};

unittest {
    assert(cast(Effect!float) Object.factory("live.effects.midiBridge.MidiBridge"));
}
