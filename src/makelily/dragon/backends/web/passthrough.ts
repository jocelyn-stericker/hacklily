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

import Effect, {IEffectArgs} from "./effect";
import IMidiEv from "./midiEv";

export interface IPassthroughArgs extends IEffectArgs {
    name: string;
}

class Passthrough extends Effect {
    name: string;

    constructor(args: IPassthroughArgs) {
        super(args);
        this.state = {};
        this.name = this.name || "Passthrough"
    }

    midiEvent(ev: IMidiEv) {
        this.emitMidi(ev);
    }

    fromUI(msg: any) {
        console.warn("passthrough ignores all messages. got ", msg);
    }
}

export default Passthrough;
