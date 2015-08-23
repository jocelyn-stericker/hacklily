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

export interface IReceiverArgs extends IEffectArgs {
    name: string;
}

class ReceiverM extends Effect {
    state: any;
    received: IMidiEv[];
    name: string;

    constructor(args: IReceiverArgs) {
        super(args);

        this.name = args.name;
        this.state = {};
        this.received = null;
    }

    midiEvent(ev: IMidiEv) {
        if (this.received) {
            this.received.push(ev);
        }
    }

    audioEvent(chan: number, ev: string) {
        // pass
    }

    fromUI(msg: any) {
        console.warn("receivers ignore all messages. got", msg);
    }
}

export default ReceiverM;
