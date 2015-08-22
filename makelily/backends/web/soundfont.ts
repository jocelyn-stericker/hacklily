/** 
 * (C) Josh Netterfield <joshua@nettek.ca> 2015.
 * Part of the Dragon MIDI/audio library <https://github.com/ripieno/dragon>.
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 * 
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import {extend} from "lodash";

import Effect, {IEffectArgs} from "./effect";
import IMidiEv from "./midiEv";

let SoundfontPlayer = require("soundfont-player") as any;

// Duck-punch to allow mp3, for iOS.
SoundfontPlayer.nameToUrl = function (name: string) {
    return 'https://cdn.rawgit.com/gleitz/midi-js-Soundfonts/master/FluidR3_GM/' + name + '-mp3.js'
};

function silence(gainProxy: GainNode) {
    let ctx = gainProxy.context;
    gainProxy.gain.setTargetAtTime(0.0, ctx.currentTime + 0.01, 0.175);
}

class WebSoundfont extends Effect {
    state: any;
    soundfontPlayer: any;
    instrument: any;
    ctx: AudioContext;
    events: {[key: string]: AudioBufferSourceNode} = {};
    gainProxy: {[key: string]: GainNode} = {};
    sustain: boolean = false;
    sustainedEvents: AudioBufferSourceNode[] = [];
    sustainedGainProxies: GainNode[] = [];

    constructor(args: IEffectArgs, ctx: AudioContext) {
        super(args);
        this.state = {};
        let fakeAudioContext = {
            decodeAudioData: ctx.decodeAudioData.bind(ctx),
            createBufferSource: ctx.createBufferSource.bind(ctx),
            createOscillator: ctx.createOscillator.bind(ctx),
            createGain: ctx.createGain.bind(ctx),
            destination: this.audioNodeOut
        };
        
        this.soundfontPlayer = new SoundfontPlayer(fakeAudioContext);
        this.instrument = this.soundfontPlayer.instrument("acoustic_grand_piano");
        this.instrument.onready(() => {
            this.state.ready = true;
            this.toUI(this.state);
        });
        this.ctx = ctx;
    }

    midiEvent(ev: IMidiEv) {
        let SEMITONES = {c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11};
        let NOTE_NAMES: {[key: number]: string} = {
            0: "C",
            1: "C#",
            2: "D",
            3: "Eb",
            4: "E",
            5: "F",
            6: "F#",
            7: "G",
            8: "Ab",
            9: "A",
            10: "Bb",
            11: "B"
        }
        let noteName = NOTE_NAMES[(ev.note*1 + 60) % 12];
        let octave = Math.floor(ev.note*1 / 12);
        let key = noteName + octave;
        switch (ev.type) {
            case "NOTE_ON":
                if (this.events[key]) {
                    this.events[key].disconnect();
                    this.events[key] = null;
                }
                this.events[key] = this.instrument.play(key, this.ctx.currentTime + 0.01, this.ctx.currentTime + 10000);
                this.gainProxy[key] = this.ctx.createGain();
                this.gainProxy[key].connect(this.audioNodeOut);
                this.gainProxy[key].gain.value = (ev.velocity/128)*2;
                // Re-route through the proxy
                this.events[key].disconnect();
                this.events[key].connect(this.gainProxy[key]);
                break;
            case "NOTE_OFF":
                if (this.events[key]) {
                    if (this.sustain) {
                        this.sustainedEvents.push(this.events[key]);
                        this.sustainedGainProxies.push(this.gainProxy[key]);
                    } else {
                        silence(this.gainProxy[key]);
                        let event = this.events[key];
                        let gainProxy = this.gainProxy[key];
                        setTimeout(() => {
                            try { event.stop(); } catch(err) {}
                            try { event.disconnect(); } catch(err) {}
                            try { gainProxy.disconnect(); } catch(err) {}
                            if (event === this.events[key]) {
                                this.gainProxy[key] = null;
                                this.events[key] = null;
                            }
                        }, 500);
                    }
                }
                break;
            case "CONTROL_CHANGE":
                if (ev.note === 64) {
                    if (ev.velocity) {
                        this.sustain = true;
                    } else {
                        let sustainedEvents = this.sustainedEvents;
                        let sustainedGainProxies = this.sustainedGainProxies;
                        sustainedGainProxies.forEach(silence);
                        setTimeout(() => {
                            sustainedGainProxies.forEach(proxy => {
                                proxy.disconnect();
                            });
                            sustainedEvents.forEach(event => {
                                event.stop();
                                event.disconnect();
                            });
                        }, 500);
                        this.sustainedEvents = [];
                        this.sustainedGainProxies = [];
                        this.sustain = false;
                    }
                } else {
                    console.warn(`Unknown control ${ev.note}`);
                }
                break;
            default:
                console.warn(`Unknown event type ${ev.type}`);
                break;
        }
    }

    fromUI(msg: any) {
        extend(this.state, msg);
        this.toUI(this.state);
    }
}

export default WebSoundfont;
