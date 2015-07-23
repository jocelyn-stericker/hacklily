// The require("Dragon") happy dance:
import __remote = require("remote");
import __Dragon = require("../source/terabithia/lib");
import {TransientError, EngineState, MidiDevice} from "../source/terabithia/lib";
var remote: typeof __remote = (window as any).require("remote");
var Dragon: typeof __Dragon = remote.require("../build/Release/lib");

import React = require("react");
var Bootstrap = require("react-bootstrap") as any;
var {Button, OverlayTrigger, Modal, Input} = Bootstrap;
import {defer, filter, map, find} from "lodash";

import DeviceSettings from "./deviceSettings";

export default class Main extends React.Component<{}, {engineState?: EngineState}> {
    render() {
        let {engineState} = this.state;
        let {audio, midi, store, graph} = engineState;
        return <div>
            <code>
                Audio State: {Dragon.Lifecycle[audio.state]}<br />
                MIDI State: {Dragon.Lifecycle[midi.state]}<br />
                Devices: {JSON.stringify(audio.devices)}<br />
                Store: {JSON.stringify(store)}<br />
                Graph: {JSON.stringify(graph)}
            </code>

            <DeviceSettings engineState={engineState}
                setMidiIn={midiIn => this.setState({midiIn})} />
        </div>;
    }
    componentWillUpdate(nextProps: {}, nextState: {engineState: EngineState}) {
        if (nextState.engineState.audio.state === Dragon.Lifecycle.Streaming &&
                this.state.engineState.audio.state === Dragon.Lifecycle.Initialized) {
            let devices = nextState.engineState.store;

            Dragon.connect({
                from: find(devices, device => device.name === 'Input 0 In').id,
                to: find(devices, device => device.name === 'Output 0 Out').id,
                startChannel: 1,
                endChannel: 1,
                offset: -1
            });

            Dragon.connect({
                from: find(devices, device => device.name === 'Input 1 In').id,
                to: find(devices, device => device.name === 'Output 1 Out').id,
                startChannel: 1,
                endChannel: 1,
                offset: -1
            });

            let id = Dragon.create({
                id: "live.effects.soundfont.Soundfont",
                channels: 2,
            });

            Dragon.toEffect({id: 7} as any, {action: "loadSoundfont", url: "/Users/josh/ripieno/dragon/vendor/gm/gm.sf2"});
            Dragon.connect({from: 5, to: 7, startChannel: 0, endChannel: 0, offset: 0} as any);
            Dragon.connect({from: 7, to: 4, startChannel: 1, endChannel: 1, offset: -1} as any);
            Dragon.connect({from: 7, to: 3, startChannel: 2, endChannel: 2, offset: -2} as any);
            console.log(id);
        }
    }
    constructor() {
        super();
        this.state = {
            engineState: {
                audio: {
                    state: Dragon.Lifecycle.Uninitialized,
                    error: null,
                    devices: null
                },
                midi: {
                    state: Dragon.Lifecycle.Uninitialized,
                    error: null,
                    devices: null
                },
                store: null,
                graph: null,
                factories: null
            }
        }
        Dragon.run((error: TransientError, engineState: EngineState) => {
            if (error) {
                alert(error.error);
                console.warn(error.error);
            } else if (engineState) {
                defer(() => this.setState({engineState: engineState}));
            }
        });
    }
}

(window as any).Dragon = Dragon;
