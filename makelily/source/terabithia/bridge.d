/** Part of dragon. Copyright (C) Josh Netterfield <joshua@nettek.ca> 2015. */
module terabithia.bridge;

import core.runtime: Runtime;
import std.stdio;

import live.core.store: Store;
import live.engine.audio: AudioEngine;

// TLS for dragon_receive thread! {
AudioEngine engine;
char[] dragon_buffer;
// }

extern(C):

void dragon_sendToUIThread(int dragonID, const char* msg) {
}

int dragon_waveform_getEndFrame() {
    return 0;
}
int dragon_waveform_getWidth() {
    return 0;
}
int dragon_waveform_setData() {
    return 0;
}

int dragon_receive(char** ptr) {
    writeln("YOLO--");
    return 0;
    // if (!engine) {
    //     engine = new AudioEngine;
    //     engine.initialize;
    //     foreach(device; engine.devices) {
    //         device.writeln;
    //     }
    //     auto store = new shared Store("rtThread");
    //     engine.stream(engine.devices[0], engine.devices[1], store);
    // }
    // import std.stdio;
    // writeln("YOLO");
    // dragon_buffer[] = "YOLO";
    // *ptr = dragon_buffer.ptr;
    // writeln("YOLO");
    // return 4; // length
}

void dragon_send(const char* ptr, int len) {
    import std.stdio;
    writeln("YOLO 2");
}

void dragon_init() {
    Runtime.initialize();
}
