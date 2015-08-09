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

import {EngineState, MidiDevice, Lifecycle, TransientMsg} from "../backends/spec";

import DragonApp from "../frontend/dragonApp";
import PhysicalOutput from "../frontend/physicalOutput";
import Synth from "../frontend/synth";
import MidiBridge from "../frontend/midiBridge";

import DeviceSettings from "./deviceSettings";
import remote from "./vendor/remote";

let DragonBackend = remote.require("../backends/realtime/build/Release/bridge");

export default class Main extends React.Component<{}, {engineState?: EngineState}> {
    render() {
        let {engineState} = this.state;
        let {audio, midi, store, graph} = engineState;
        return <div>
            <DragonApp backend={DragonBackend} onMessage={this.handleMsg.bind(this)}
                    onStateChanged={engineState => this.setState({engineState})}>
                <PhysicalOutput all audio>
                    <Synth
                            soundfont={remote.require("process").cwd() + "/../backends/realtime/vendor/gm/gm.sf2"}
                            channels={[
                                {
                                    program: 0
                                }
                            ]}>
                        <MidiBridge channel={0} />
                    </Synth>
                </PhysicalOutput>
            </DragonApp>

            <code>
                Audio State: {Lifecycle[audio.state]}<br />
                MIDI State: {Lifecycle[midi.state]}<br />
                Devices: {JSON.stringify(audio.devices)}<br />
                Store: {JSON.stringify(store)}<br />
                Graph: {JSON.stringify(graph)}
            </code>

            <DeviceSettings backend={DragonBackend} engineState={engineState} />
        </div>;
    }
    handleMsg(msg: TransientMsg) {
        if (msg.error) {
            alert(msg.error);
            console.warn(msg.error);
        } else if (msg.msg) {
            console.log(msg.msg);
        }
    }

    constructor() {
        super();
        this.state = {
            engineState: {
                audio: {
                    state: Lifecycle.Uninitialized,
                    error: null,
                    devices: null
                },
                midi: {
                    state: Lifecycle.Uninitialized,
                    error: null,
                    devices: null
                },
                store: null,
                graph: null,
                factories: null
            }
        };
    }
}

(window as any).Dragon = DragonBackend;
