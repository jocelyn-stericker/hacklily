/** Part of dragon. Copyright (C) Josh Netterfield <joshua@nettek.ca> 2015. */

module live.core.store;

import live.core.effect;

import core.atomic: atomicOp;
import std.algorithm: keys, map;
import std.concurrency: send, locate;
import std.conv: to;
import std.json: JSONValue;
import std.range: array;
import std.string: toStringz;
import std.traits: EnumMembers;

synchronized class Store {
    struct Entry {
        int id = -1;
        string name = "";
        AudioWidth audioWidth = AudioWidth.Dummy;
        bool isMidi = false;
        bool isHardware = false;
        Connectivity connectivity = Connectivity.None;
        string threadName;
        this(int c_id, string c_name, AudioWidth c_width,
                bool c_isMidi, bool c_isHardware,
                Connectivity c_connectivity,
                string c_threadName) {
            this.id = c_id;
            this.name = c_name;
            this.audioWidth = c_width;
            this.isMidi = c_isMidi;
            this.isHardware = c_isHardware;
            this.connectivity = c_connectivity;
            this.threadName = c_threadName;
        }

        void toRTThread(string s) {
            auto rtThread = locate(threadName);
            rtThread.send(RTCommand.MessageIn, id, s);
        }
        void toUIThread(string s) {
            dragon_sendToUIThread(id, s.toStringz());
        }
        JSONValue serialize() {
            return JSONValue([
                "id": id.to!JSONValue,
                "name": name.to!JSONValue,
                "audioWidth": audioWidth.to!string.to!JSONValue,
                "isMidi": isMidi.to!JSONValue,
                "isHardware": isHardware.to!JSONValue,
                "connectivity": connectivity.to!string.to!JSONValue,
            ]);
        }
    }

    private Entry[int] m_byId;
    private Entry[string] m_byName;
    private bool[Entry][AudioWidth] m_byWidth;
    private bool[Entry][bool] m_byIsMidi;
    private bool[Entry][bool] m_byIsHardware;
    private bool[Entry][Connectivity] m_byConnectivity;
    private bool[Entry] m_all;
    private int lastID = 0;
    int getNewID() {
        return atomicOp!"+="(lastID, 1);
    }

    Entry opIndex(int index) {
        if (index in m_byId) {
            return m_byId[index];
        }
        return Entry();
    }
    Entry opIndex(string name) {
        if (name in m_byName) {
            return m_byName[name];
        }
        return Entry();
    }
    enum Tribool {
        True = 1,
        False = 0,
        Any = -1
    }
    bool[Entry] query(AudioWidth width = AudioWidth.Any, Tribool midi = Tribool.Any,
            Tribool hardware = Tribool.Any,
            Connectivity connectivity = Connectivity.Any) {

        bool[Entry] ret;
        bool filled = false;

        auto merge = delegate(shared(bool[Entry]) toMerge) {
            if (!filled) {
                ret = (cast(bool[Entry]) toMerge).dup;
                filled = true;
            } else {
                bool[Entry] toRemove;
                foreach(entry, val; ret) {
                    if (!(entry in toMerge)) {
                        toRemove[entry] = true;
                    }
                }
                foreach(entry, val; toRemove) {
                    ret.remove(entry);
                }
            }
        };

        if (width != AudioWidth.Any) {
            if (!(width in m_byWidth)) {
                return ret.init;
            }
            merge(m_byWidth[width]);
        }

        if (midi != Tribool.Any) {
            if (!(!!midi in m_byIsMidi)) {
                return ret.init;
            }
            merge(m_byIsMidi[!!midi]);
        }

        if (hardware != Tribool.Any) {
            if (!((!!hardware) in m_byIsHardware)) {
                return ret.init;
            }
            merge(m_byIsHardware[!!hardware]);
        }

        if (connectivity != Connectivity.Any) {
            if (!(connectivity in m_byConnectivity)) {
                return ret.init;
            }
            merge(m_byConnectivity[connectivity]);
        }

        if (!filled) {
            ret = (cast(bool[Entry]) m_all).dup;
        }

        return ret;
    }

    /**
     * Overload for easy interfacing with JSON bridge.
     */
    bool[Entry] query(string width, string midi,
            string hardware, string connectivity) {

        return query(to!AudioWidth(width), midi.toTribool, hardware.toTribool,
                to!Connectivity(connectivity));
    }

    /**
     * Returns hardware inputs.
     */
    bool[Entry] inputs() {
        return query(AudioWidth.Any, Tribool.Any, Tribool.True, Connectivity.Input);
    }

    /**
     * Returns hardware midi inputs.
     */
    bool[Entry] midiInputs() {
        return query(AudioWidth.Any, Tribool.True, Tribool.True, Connectivity.Input);
    }

    /**
     * Returns hardware outputs.
     */
    bool[Entry] outputs() {
        return query(AudioWidth.Any, Tribool.Any, Tribool.True, Connectivity.Output);
    }

    /**
     * Returns hardware midi outputs.
     */
    bool[Entry] midiOutputs() {
        return query(AudioWidth.Any, Tribool.True, Tribool.True, Connectivity.Output);
    }

    shared(bool[Entry]) all() {
        return m_all;
    }

    void insert(Entry e) {
        e.name ~= (e.connectivity & Connectivity.Input ? " In" :
             (e.connectivity & Connectivity.Output ? " Out" : ""));
        m_byId[e.id] = e;
        m_byName[e.name] = e;
        m_byWidth[e.audioWidth][e] = true;
        m_byIsMidi[e.isMidi][e] = true;
        m_byIsHardware[e.isHardware][e] = true;
        m_byConnectivity[e.connectivity][e] = true;

        if (e.connectivity == Connectivity.Effect) {
            m_byConnectivity[Connectivity.Input][e] = true;
            m_byConnectivity[Connectivity.Output][e] = true;
        }

        if (e.audioWidth & AudioWidth.HWIN) {
            m_byWidth[AudioWidth.HWIN][e] = true; }

        if (e.audioWidth & AudioWidth.Float) {
            m_byWidth[AudioWidth.Float][e] = true; }
        else if (e.audioWidth & AudioWidth.Double) {
            m_byWidth[AudioWidth.Double][e] = true; }

        m_all[e] = true;
    }

    void insert(int c_id, string c_name, AudioWidth c_width,
                bool c_isMidi, bool c_isHardware,
                Connectivity c_connectivity) {
        insert(Entry(c_id, c_name, c_width, c_isMidi, c_isHardware,
                c_connectivity, threadName));
    }

    void insert(int c_id, string c_name, string c_width,
                bool c_isMidi, bool c_isHardware,
                string c_connectivity) {
        insert(c_id, c_name, c_width, c_isMidi, c_isHardware,
                c_connectivity);
    }

    void remove(Entry e) {
        m_byId.remove(e.id);
        m_byName.remove(e.name);
        m_byWidth[e.audioWidth].remove(e);
        m_byIsMidi[e.isMidi].remove(e);
        m_byIsHardware[e.isHardware].remove(e);
        m_byConnectivity[e.connectivity].remove(e);

        m_byConnectivity[Connectivity.Input].remove(e);
        m_byConnectivity[Connectivity.Output].remove(e);
        m_byWidth[AudioWidth.HWIN].remove(e);
        m_byWidth[AudioWidth.Float].remove(e);
        m_byWidth[AudioWidth.Double].remove(e);
    }

    void remove(int id) {
        remove(m_byId[id]);
    }

    JSONValue serialize() {
        return all.keys.map!(entry => entry.serialize).array.to!JSONValue;
    }

    string threadName;

    shared this(string threadName) {
        this.threadName = threadName;
        foreach (w; EnumMembers!AudioWidth) {
            this.m_byWidth[w] = (bool[Store.Entry]).init;
        }
    }
}

private:
Store.Tribool toTribool(string a) {
    switch(a) {
        case "True":
        case "true":
        case "1":
            return Store.Tribool.True;
        case "False":
        case "false":
        case "0":
            return Store.Tribool.False;
        case "Any":
        case "any":
        case "-1":
            return Store.Tribool.Any;
        default:
            assert(0);
    }
}

