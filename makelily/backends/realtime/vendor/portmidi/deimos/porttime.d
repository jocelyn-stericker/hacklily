module portmidi.porttime;  /* millisecond timer */

/+
 + This is a translation of PortMidi's millisecond timer function to the D2 language.
 + Translated by Andrej Mitrovic.
 +
 + NOTE(jnetterf): Porttime is not ported to Linux.
 +/

import std.stdio;
import core.time;
import core.thread;
import live.engine.portmidi;

