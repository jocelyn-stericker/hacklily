import deimos.portaudio : Pa_Sleep;
import std.conv, std.stdio;
import std.stdio;

import live.core.store: Store;
import live.engine.audio: AudioEngine;

int main() {
    AudioEngine engine = new AudioEngine;
    engine.initialize;
    foreach(device; engine.devices) {
        device.writeln;
    }
    auto store = new shared Store("rtThread");
    engine.stream(engine.devices[0], engine.devices[1], store);
    Pa_Sleep(1000);
    engine.close();

    return 0;
}
