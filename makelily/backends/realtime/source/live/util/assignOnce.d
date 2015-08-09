/** Part of dragon. Copyright (C) Josh Netterfield <joshua@nettek.ca> 2015. */

module live.util.assignOnce;

import std.exception: enforce;

export struct AssignOnce(type) {
    private type m_payload;
    bool assigned = false;
    @property pure nothrow type cRef() const {
        return assigned ? m_payload : -1; }

    void opAssign(type b) {
        enforce(!assigned, "AssignOnce can only be assigned once.");
        m_payload = b;
        assigned = true;
    }
    alias cRef this;
};
