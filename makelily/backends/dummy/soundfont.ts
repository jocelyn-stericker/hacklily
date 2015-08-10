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

class DummySoundfont extends Effect {
    state: any;
    nextMIDIEvent: string;
    channelsToEmit: number;

    constructor(args: IEffectArgs) {
        super(args);
        this.state = {};
    }

    midiEvent(ev: IMidiEv) {
        console.assert(!isNaN(ev.channel));
        console.assert(!isNaN(ev.note));
        console.assert(!isNaN(ev.velocity));
        console.assert(ev.type === "NOTE_ON" || ev.type === "NOTE_OFF");
        this.nextMIDIEvent = `${ev.type}(Program ${this.state.channels[ev.channel].program}, ${ev.note}, ${ev.velocity})`;
        this.channelsToEmit = this.channels;
    }

    audioEvent(chan: number, ev: string) {
        if (this.nextMIDIEvent) {
            this.emitAudio(chan, `${ev} | ${this.nextMIDIEvent}`);
            --this.channelsToEmit;
            if (!this.channelsToEmit) {
                this.nextMIDIEvent = null;
            }
        } else {
            this.emitAudio(chan, `${ev} | Soundfont ${chan}`);
        }
    }

    fromUI(msg: any) {
        extend(this.state, msg);
        this.toUI(this.state);
    }
}

export default DummySoundfont;
