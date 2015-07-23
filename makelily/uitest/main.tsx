// The require("Dragon") happy dance:
import __remote = require("remote");
import __Dragon = require("../source/terabithia/lib");
import {TransientError, EngineState, MidiDevice} from "../source/terabithia/lib";
var remote: typeof __remote = (window as any).require("remote");
var Dragon: typeof __Dragon = remote.require("../build/Release/lib");
var Dialog: any = remote.require("dialog");
var App: GitHubElectron.App = remote.require("app");

import React = require("react");
var Bootstrap = require("react-bootstrap") as any;
var {Button, OverlayTrigger, Modal, Input} = Bootstrap;
import {defer, filter, map, find} from "lodash";

export default class Main extends React.Component<{}, {engineState?: EngineState, midi?: MidiDevice}> {
    render() {
        let {engineState} = this.state;
        let {audio} = engineState;
        let {midi} = engineState;
        return <div>
            Audio: {Dragon.Lifecycle[audio.state]}<br />
            Devices: {JSON.stringify(audio.devices)}

            <Modal show={audio.state === Dragon.Lifecycle.Initialized} onHide={this.quit}>
              <Modal.Header closeButton>
                <Modal.Title>Device setup</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <form className="form-horizontal">
                  <Input type="select" label="Audio in" placeholder="select" ref="audioIn"
                      labelClassName="col-xs-12 col-sm-2" wrapperClassName="col-xs-12 col-sm-10">
                    {audio.devices && audio.devices
                        .filter(device => device.maxInputChannels > 0)
                        .map(device =>
                            <option value={device.name} key={device.name}>
                                {device.name}{' '}({device.maxInputChannels}{' '}channels)
                            </option>
                        )
                    }
                  </Input>
                  <Input type="select" label="Audio out" placeholder="select" ref="audioOut"
                      labelClassName="col-xs-12 col-sm-2" wrapperClassName="col-xs-12 col-sm-10">
                    {audio.devices && audio.devices
                        .filter(device => device.maxOutputChannels > 0)
                        .map(device =>
                            <option value={device.name} key={device.name}>
                                {device.name}{' '}({device.maxOutputChannels}{' '}channels)
                            </option>
                        )
                    }
                  </Input>
                  <Input type="select" label="MIDI in" placeholder="select" ref="midiIn"
                      labelClassName="col-xs-12 col-sm-2" wrapperClassName="col-xs-12 col-sm-10">
                    {midi.devices && midi.devices
                        .filter(device => device.input)
                        .map(device =>
                            <option value={device.name} key={device.name}>
                                {device.name}{' '}(input)
                            </option>
                        )
                    }
                  </Input>
                </form>
              </Modal.Body>
              <Modal.Footer>
                <Button bsStyle="primary" onClick={this.stream}>Start »</Button>
              </Modal.Footer>
            </Modal>
        </div>;
    }
    quit = () => {
        if (Dialog.showMessageBox(remote.getCurrentWindow(), {
                message: 'Are you sure you want to quit?',
                title: 'Really quit?',
                buttons: ['No', 'Yes']}) === 1) {
            App.quit();
        }
    }
    stream = () => {
        let audioIn = (this.refs["audioIn"] as any).getValue();
        let audioOut = (this.refs["audioOut"] as any).getValue();
        let midiIn = (this.refs["midiIn"] as any).getValue();

        let {midi, audio} = this.state.engineState;
        Dragon.startStreaming(
            find(audio.devices, device => device.name === audioIn),
            find(audio.devices, device => device.name === audioOut)
        );
        this.setState({
            midiIn: find(midi.devices, device => device.name === midiIn)
        });
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
                // if (engineState.audio.state === Dragon.Lifecycle.Uninitialized) {
                //     console.log("Not initialized yet.");
                // } else if (engineState.audio.state === Dragon.Lifecycle.Initialized) {
                //     console.log("initialized");
                //     Dragon.startStreaming(engineState.audio.devices[0], engineState.audio.devices[1]);
                // } else if (engineState.audio.state === Dragon.Lifecycle.Error) {
                //     console.log("error", engineState.audio.error);
                // }
                // console.log('--');
                console.log(JSON.stringify(engineState, null, 2));
            }
        });
    }
}
