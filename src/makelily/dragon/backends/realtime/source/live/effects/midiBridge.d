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
        auto event = JSONValue();
        final switch(e.type) {
            case MidiEventType.NOTE_OFF:
                event.object["type"] = JSONValue("NOTE_OFF");
                event.object["channel"] = JSONValue(e.channel);
                event.object["note"] = JSONValue(e.note);
                event.object["velocity"] = JSONValue(e.velocity);
                break;
            case MidiEventType.NOTE_ON:
                event.object["type"] = JSONValue("NOTE_ON");
                event.object["channel"] = JSONValue(e.channel);
                event.object["note"] = JSONValue(e.note);
                event.object["velocity"] = JSONValue(e.velocity);
                break;
            case MidiEventType.POLYPHONIC_AFTERTOUCH:
                event.object["type"] = JSONValue("POLYPHONIC_AFTERTOUCH");
                event.object["channel"] = JSONValue(e.channel);
                event.object["note"] = JSONValue(e.note);
                event.object["velocity"] = JSONValue(e.velocity);
                break; 
            case MidiEventType.CONTROL_CHANGE:
                event.object["type"] = JSONValue("CONTROL_CHANGE");
                event.object["channel"] = JSONValue(e.channel);
                event.object["controller"] = JSONValue(e.controller);
                event.object["controllerValue"] = JSONValue(e.controllerValue);
                break; 
            case MidiEventType.PROGRAM_CHANGE:
                event.object["type"] = JSONValue("PROGRAM_CHANGE");
                event.object["channel"] = JSONValue(e.channel);
                event.object["program"] = JSONValue(e.program);
                break; 
            case MidiEventType.CHANNEL_AFTERTOUCH:
                event.object["type"] = JSONValue("CHANNEL_AFTERTOUCH");
                event.object["channel"] = JSONValue(e.channel);
                event.object["velocity"] = JSONValue(e.velocity);
                break; 
            case MidiEventType.PITCH_WHEEL:
                event.object["type"] = JSONValue("PITCH_WHEEL");
                event.object["channel"] = JSONValue(e.channel);
                event.object["pitchWheel"] = JSONValue(e.pitchWheel);
                break; 
            case MidiEventType.SYSEX:
                import std.stdio;
                writeln("Ignoring sysex.");
                return;
        }
        auto json = JSONValue();
        json.object["event"] = event;

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
