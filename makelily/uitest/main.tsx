/**
 * Renders the application.
 */

import Dragon = require("./vendor/bridge");
import React = require("react");

import {Button, OverlayTrigger, Modal, Input} from "react-bootstrap";
import {defer, filter, map, find} from "lodash";

import DeviceSettings from "./deviceSettings";

export default class Main extends React.Component<{}, {engineState?: Dragon.EngineState, midiIn?: Dragon.MidiDevice}> {
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
    componentWillUpdate(nextProps: {}, nextState: {engineState: Dragon.EngineState}) {
        if (nextState.engineState.audio.state === Dragon.Lifecycle.Streaming &&
                this.state.engineState.audio.state === Dragon.Lifecycle.Initialized) {
            let devices = nextState.engineState.store;

            Dragon.connect({
                from: find(devices, device => device.name === 'Input 0 In').id,
                to: find(devices, device => device.name === 'Output 0 Out').id,
                fromChannel: 0,
                toChannel: 0,
            });

            Dragon.connect({
                from: find(devices, device => device.name === 'Input 1 In').id,
                to: find(devices, device => device.name === 'Output 1 Out').id,
                fromChannel: 0,
                toChannel: 0,
            });

            let soundfontId = Dragon.create({
                id: "live.effects.soundfont.Soundfont",
                channels: 2,
            });

            Dragon.toEffect({id: soundfontId} as any, {action: "loadSoundfont", url: "/Users/josh/ripieno/dragon/vendor/gm/gm.sf2"});
            Dragon.connect({from: 5, to: soundfontId, fromChannel: -1, toChannel: -1} as any);
            Dragon.connect({from: soundfontId, to: 4, fromChannel: 0, toChannel: 0} as any);
            Dragon.connect({from: soundfontId, to: 3, fromChannel: 1, toChannel: 0} as any);
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
        Dragon.run((error: Dragon.TransientError, engineState: Dragon.EngineState) => {
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
