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

import IMidiEv from './midiEv';

import {extend} from 'lodash';

export interface IEffectArgs {
    channels: number;
    audioNodeIn: AudioNode;
    audioNodeOut: AudioNode;
    emitMidi: (msg: IMidiEv) => void;
    id: number;
    toUI: (msg: string) => void;
}

class Effect implements IEffectArgs {
    channels: number;
    audioNodeIn: AudioNode;
    audioNodeOut: AudioNode;
    emitMidi: (msg: IMidiEv) => void;
    id: number;
    state: any;
    toUI: (msg: string) => void;

    constructor(args: IEffectArgs) {
        extend(this, args);
    }

    midiEvent(ev: IMidiEv) {
        throw new Error("midiEvent not implemented");
    }

    fromUI(msg: any) {
        throw new Error("fromUI not implemented");
    }
}

export default Effect;
