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

import React = require("react");

import DAWComponent from "./dawComponent";

export interface IProps {
    children?: any;
    channel: number;
}
export interface IState {
    remote?: any;
}

@DAWComponent("live.effects.midiBridge.MidiBridge", 2)
class MidiBridge extends React.Component<IProps, IState> {

    setRemoteState: (remoteState: any) => void;

    noteOn(note: number, velocity: number) {
        let {channel} = this.props;
        let type = "NOTE_ON";
        let event = {type, note, velocity, channel};

        this.setRemoteState({event});
    }

    noteOff(note: number, velocity: number) {
        let {channel} = this.props;
        let type = "NOTE_ON";
        let event = {type, note, velocity, channel};

        this.setRemoteState({event});
    }

    render() {
        return <span>
            {this.props.children}
        </span>;
    }
};

export default MidiBridge;
