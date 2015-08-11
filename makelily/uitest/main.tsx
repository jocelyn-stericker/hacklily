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

import {IDragonBackend, IEngineState, Lifecycle, ITransientMsg} from "../backends/spec";
import DummyBackend from "../backends/dummy/dummy";
import WebBackend, {isSupported as webBackendSupported} from "../backends/web/web";

import DragonApp from "../frontend/dragonApp";
import PhysicalOutput from "../frontend/physicalOutput";
import PhysicalInput from "../frontend/physicalInput";
import Synth from "../frontend/synth";
import MidiBridge from "../frontend/midiBridge";

import DeviceSettings from "./deviceSettings";
import remote from "./vendor/remote";

let DragonBackend = getDragonBackend();
let SOUNDFONT_URL = remote ? remote.require("process").cwd() + "/../backends/realtime/vendor/gm/gm.sf2" : "yolo";

function getDragonBackend() {
    if (remote) {
        return remote.require("../backends/realtime/build/Release/bridge") as IDragonBackend;
    }
    if (webBackendSupported) {
        return WebBackend;
    }
    
    console.warn("Using dummy backend.");
    return DummyBackend;
}

export default class Main extends React.Component<{}, {engineState?: IEngineState}> {
    render() {
        let {engineState} = this.state;
        let {audio, midi, store, graph} = engineState;
        return <div>
            <DragonApp backend={DragonBackend} onMessage={this.handleMsg.bind(this)}
                    onStateChanged={engineState => this.setState({engineState})}>
                <PhysicalOutput all audio>
                    <Synth
                            soundfont={SOUNDFONT_URL}
                            channels={[
                                {
                                    program: 0
                                }
                            ]}>
                        <MidiBridge channel={0} ref="midiBridge" />
                        <PhysicalInput all midi/>
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
    handleMsg(msg: ITransientMsg) {
        if (msg.error) {
            alert(msg.error);
            console.warn(msg.error);
        } else if (msg.msg) {
            console.log(msg.msg);
        }
    }

    componentDidMount() {
        // setInterval(() => {
        //     (this.refs["midiBridge"] as any).noteOn(60);
        // }, 1200);
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
