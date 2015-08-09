/** Part of dragon. Copyright (C) Josh Netterfield <joshua@nettek.ca> 2015. */

module live.core.event;

import core.time: TickDuration;
import std.conv: to;
import std.exception: enforce;

public enum MidiEventType : char {
    NOTE_OFF = 0x80,
    NOTE_ON = 0x90,
    POLYPHONIC_AFTERTOUCH = 0xA0,
    CONTROL_CHANGE = 0xB0,
    PROGRAM_CHANGE = 0xC0,
    CHANNEL_AFTERTOUCH = 0xD0,
    PITCH_WHEEL = 0xE0,
    SYSEX = 0xF0
}

public enum Controller : char {
    Continuous0MSB = 0x00,
    ModulationWheelMSB, 
    BreathControlMSB,
    Continuous3MSB,
    FootControllerMSB,
    PortamentoTimeMSB,
    DataEntryMSB,                      
    MainVolumeMSB,
    Continuous8MSB, 
    Continuous9MSB,
    Continuous10MSB, 
    Continuous11MSB,
    Continuous12MSB,
    Continuous13MSB,
    Continuous14MSB,
    Continuous15MSB,
    Continuous16MSB,
    Continuous17MSB,
    Continuous18MSB,
    Continuous19MSB,
    Continuous20MSB,
    Continuous21MSB,
    Continuous22MSB,
    Continuous23MSB,
    Continuous24MSB,
    Continuous25MSB,
    Continuous26MSB,
    Continuous27MSB,
    Continuous28MSB,
    Continuous29MSB,
    Continuous30MSB,
    Continuous31MSB,

    Continuous0LSB,
    ModulationWheelLSB, 
    BreathControlLSB,
    Continuous3LSB,
    FootControllerLSB,
    PortamentoTimeLSB,
    DataEntryLSB,                      
    MainVolumeLSB,
    Continuous8LSB, 
    Continuous9LSB,
    Continuous10LSB, 
    Continuous11LSB,
    Continuous12LSB,
    Continuous13LSB,
    Continuous14LSB,
    Continuous15LSB,
    Continuous16LSB,
    Continuous17LSB,
    Continuous18LSB,
    Continuous19LSB,
    Continuous20LSB,
    Continuous21LSB,
    Continuous22LSB,
    Continuous23LSB,
    Continuous24LSB,
    Continuous25LSB,
    Continuous26LSB,
    Continuous27LSB,
    Continuous28LSB,
    Continuous29LSB,
    Continuous30LSB,
    Continuous31LSB,

    Damper = 0x40,
    Sustain = 0x40,
    Portamento,
    Sustenuto,
    SoftPedal,
    UndefinedOnOff4,
    UndefinedOnOff5,
    UndefinedOnOff6,
    UndefinedOnOff7,
    UndefinedOnOff8,
    UndefinedOnOff9,
    UndefinedOnOff10,
    UndefinedOnOff11,
    UndefinedOnOff12,
    UndefinedOnOff13,
    UndefinedOnOff14,
    UndefinedOnOff15,
    UndefinedOnOff16,
    UndefinedOnOff17,
    UndefinedOnOff18,
    UndefinedOnOff19,
    UndefinedOnOff20,
    UndefinedOnOff21,
    UndefinedOnOff22,
    UndefinedOnOff23,
    UndefinedOnOff24,
    UndefinedOnOff25,
    UndefinedOnOff26,
    UndefinedOnOff27,
    UndefinedOnOff28,
    UndefinedOnOff29,
    UndefinedOnOff30,
    UndefinedOnOff31,
    DataEntryPositive,
    DataEntryNegative,
    Undefined2,
    Undefined3,
    Undefined4,
    Undefined5,
    Undefined6,
    Undefined7,
    Undefined8,
    Undefined9,
    Undefined10,
    Undefined11,
    Undefined12,
    Undefined13,
    Undefined14,
    Undefined15,
    Undefined16,
    Undefined17,
    Undefined18,
    Undefined19,
    Undefined20,
    Undefined21,
    Undefined22,
    Undefined23,
    Undefined24,
    Undefined25,
    LocalControlOnOff,
    AllNotesOff,   
    OmniModeOff,
    OmniModeOn,
    PolyModeOn,
    PolyModeOff
}

unittest {
    assert(Controller.Continuous0MSB == 0x00);
    assert(Controller.MainVolumeMSB == 0x07);
    assert(Controller.Continuous8MSB == 0x08);
    assert(Controller.Continuous31MSB == 0x1F);
    assert(Controller.Continuous0LSB == 0x20);
    assert(Controller.Continuous8LSB == 0x28);
    assert(Controller.Continuous31LSB == 0x3F);
    assert(Controller.Damper == 0x40);
    assert(Controller.SoftPedal == 0x43);
    assert(Controller.UndefinedOnOff4 == 0x44);
    assert(Controller.UndefinedOnOff31 == 0x5F);
    assert(Controller.DataEntryNegative == 0x61);
    assert(Controller.Undefined2 == 0x62);
    assert(Controller.Undefined25 == 0x79);
    assert(Controller.PolyModeOff == 0x7F);
}

@safe export struct MidiEvent {
    this(int midi, long t = cast(long) ((cast(float) TickDuration.
            currSystemTick().currSystemTick().hnsecs -
            TickDuration.appOrigin.hnsecs)*625.0/3.0)) { // to nframes
        m_payload = midi;
        m_time = t;

        enforce(hasValidType, new Exception("MidiEvent is malformed."));
        enforce(hasValidByte2, new Exception("The second ubyte must be less " ~
                    "or equal to 0x7F"));
        enforce(hasValidByte3, new Exception("The third ubyte must be less " ~
                    "or equal to 0x7F"));
    }
    this(ubyte msg, ubyte st1, ubyte st2, long t = cast(long) ((cast(float)
            TickDuration.currSystemTick().hnsecs -
            TickDuration.appOrigin.hnsecs)*625.0/3.0)) { // to nframes
        this((msg << 16) | (st1 << 8) | st2);
        m_time = t;
    }
    this(in MidiEvent b) {
        m_payload = b.m_payload;
        m_time = b.m_time;
    }

    unittest {
        MidiEvent fullVelocity = MidiEvent(0x9C507F);
        assert(fullVelocity.type == MidiEventType.NOTE_ON);
        assert(fullVelocity.velocity == 127);
        assert(fullVelocity.channel == 13);
        assert(fullVelocity.note == 80);
    }

    private int m_payload = 0x000000;
    private long m_time = -1;

    @trusted string toString() {
        if (type == MidiEventType.SYSEX) return "SYSEX";
        return "MidiEvent(" ~ to!string(type) ~ ", channel " ~
            to!string(channel) ~ ", " ~ to!string((m_payload & 0xFF00) >> 8) ~
            ", " ~ to!string(m_payload & 0x00FF) ~ ")";
    }

    private @property bool hasValidType() const {
        bool exists = false;
        foreach (t; __traits(allMembers, MidiEventType)) {
            if ((m_payload & 0xF00000) >> 16 == mixin("MidiEventType." ~ t)) {
                exists = true;
                break;
            }
        }
        return exists;
    }
    private @property pure bool hasValidByte3() const {
        return (m_payload & 0xF00000) == 0xF00000 || ((m_payload & 0xFF) <= 0x7F);
    }
    private @property pure bool hasValidByte2() const {
        return (m_payload & 0xF00000) == 0xF00000 || (((m_payload & 0xFF00) >> 8) <= 0x7F);
    }
    invariant() {
        assert(hasValidType, "MidiEvent does not have a valid type.");
        assert(hasValidByte3, "The third ubyte for NON SYSEX events shall be " ~
                "less than or equal to 0x7F");
        assert(hasValidByte2, "The second ubyte for NON SYSEX events shall " ~
                "be less than or equal to 0x7F");
        assert(m_time >= 0);
    }

    @property @trusted MidiEventType type() {
        return to!MidiEventType(cast(char) ((m_payload & 0xF00000) >> 16));
    }

    unittest {
        MidiEvent fullVelocity = MidiEvent(0x9C507F);
        assert(fullVelocity.type == MidiEventType.NOTE_ON);

        // Note: NOTE_OFF is deprecated.
        MidiEvent off = MidiEvent(0x8C507F);
        assert(off.type == MidiEventType.NOTE_OFF);

        MidiEvent poly = MidiEvent(0xAF0000);
        assert(poly.type == MidiEventType.POLYPHONIC_AFTERTOUCH);
    }

    @property int channel() {
        enforce(type != MidiEventType.SYSEX,
            new Exception("SYSEX messages do not have channels."));

        return ((m_payload & 0x0F0000) >> 16) + 1;
    }

    @property int note() {
        enforce(type == MidiEventType.NOTE_OFF ||
                type == MidiEventType.NOTE_ON ||
                type == MidiEventType.POLYPHONIC_AFTERTOUCH,
                new Exception(type ~ " does not have a note property."));

        return (m_payload & 0xFF00) >> 8;
    }

    @property @trusted Controller controller() {
        enforce(type == MidiEventType.CONTROL_CHANGE,
                new Exception(type ~ "does not have a controller property."));
        return to!Controller(cast(char) ((m_payload & 0xFF00) >> 8));
    }

    @property int controllerValue() {
        enforce(type == MidiEventType.CONTROL_CHANGE,
                new Exception(type ~ "does not have a controllerValue property."));
        return m_payload & 0xFF;
    }

    @property int velocity() {
        enforce(type == MidiEventType.NOTE_OFF ||
                type == MidiEventType.NOTE_ON ||
                type == MidiEventType.POLYPHONIC_AFTERTOUCH ||
                type == MidiEventType.CHANNEL_AFTERTOUCH,
                new Exception(type ~ " does not have a velocity property."));
        if (type == MidiEventType.CHANNEL_AFTERTOUCH) {
            return (m_payload & 0xFF00) >> 8;
        } else {
            return m_payload & 0xFF;
        }
    }
    @property void velocity(int v) {
        velocity();
        enforce(v >= 0 && v <= 0x7F, "Velocity outside 0x0..0x7F");

        if (type == MidiEventType.CHANNEL_AFTERTOUCH) {
            m_payload = (m_payload & 0xff00ff) | (v << 8);
        } else {
            m_payload = (m_payload & 0xffff00) | v;
        }
    }
    alias velocity pressure;


    @trusted unittest {
        import std.stdio;
        MidiEvent fullVelocity = MidiEvent(0x9C507F);
        assert(fullVelocity.velocity == 127);
        MidiEvent off = MidiEvent(0x9C5000);
        assert(off.velocity == 0);
        off.velocity = 2;
        assert(off.velocity == 2);
        assertThrown!Exception(() {
            off.velocity = 0x80;
        }());

        MidiEvent poly = MidiEvent(0xD24300);
        assert(poly.pressure == 0x43);
        poly.pressure = 0x7C;
        assert(poly.m_payload == 0xD27C00);
    }

    @property int pitchWheel() {
        enforce(type == MidiEventType.PITCH_WHEEL,
                new Exception(type ~ " does not a pitchWheel property."));
        return ((m_payload & 0xFF00) >> 1) | (m_payload & 0xFF); 
    }
    @property void pitchWheel(int p) {
        pitchWheel();
        enforce(p < (0x7F + 0x7F0));
        m_payload = (m_payload & 0xFF0000) | ((p & 0xFF80) << 1) | (p & 0x7F);
    }

    @trusted unittest {
        MidiEvent ev = MidiEvent(0xE17F7F);
        assert(ev.pitchWheel == 16383);
        ev.pitchWheel = 0;
        assert(ev.pitchWheel == 0);
        ev.pitchWheel = 0x7D;
        assert(ev.pitchWheel == 0x7D);
        ev.pitchWheel = 0x80;
        assert(ev.pitchWheel == 0x80);
        assert(ev.m_payload == 0xE10100);
        assertThrown!Exception(() {
            ev.pitchWheel = 0x7F80;
        }());
    }

    @property int program() {
        enforce(type == MidiEventType.PROGRAM_CHANGE,
                new Exception(type ~ " does not have a program property."));
        return (m_payload & 0xFF00) >> 8;
    }

    pure nothrow bool opEquals(in int midi) const {
        return m_payload == midi;
    }

    pure nothrow bool opEquals(in MidiEvent midi) const {
        return m_payload == midi.m_payload &&
            m_time == midi.m_time;
    }

    @property pure nothrow int message() {
        return (m_payload & 0xFF0000) >> 16;
    }

    @property pure nothrow int status1() {
        return (m_payload & 0x00FF00) >> 8;
    }

    @property pure nothrow int status2() {
        return (m_payload & 0x0000FF);
    }

    @property pure nothrow long time() {
        return m_time;
    }

    @property pure nothrow void time(long time) {
        m_time = time;
    }
};

unittest {
    assertThrown!Exception(() {
        MidiEvent ev = MidiEvent(0x100000);
    }());
    assertThrown!Exception(() {
        MidiEvent ev = MidiEvent(0xA00080);
    }());
    assertThrown!Exception(() {
        MidiEvent ev = MidiEvent(0xA08000);
    }());
    assertNotThrown!Exception(() {
        MidiEvent ev = MidiEvent(0xA00000);
    }());
}
