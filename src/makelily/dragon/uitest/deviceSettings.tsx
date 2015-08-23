/**
 * Renders the device settings modal.
 * To be shown only when audio is initialized, but not streaming.
 */

import Dialog from "./vendor/dialog";
import remote from "./vendor/remote";

import React = require("react");
import {Button, Modal, Input} from "react-bootstrap";
import {find} from "lodash";

import {IEngineState, Lifecycle, IDragonBackend} from "../backends/spec";

export interface IProps {
    backend: IDragonBackend;
    engineState?: IEngineState;
}

export default class DeviceSettings extends React.Component<IProps, void> {

    quit = () => {
        if (Dialog.showMessageBox(remote.getCurrentWindow(), {
                message: "Are you sure you want to quit?",
                title: "Really quit?",
                buttons: ["No", "Yes"]}) === 1) {
            window.close();
        }
    };

    stream = () => {
        let audioIn = (this.refs["audioIn"] as any).getValue();
        let audioOut = (this.refs["audioOut"] as any).getValue();

        let {audio} = this.props.engineState;
        this.props.backend.startStreaming(
            find(audio.devices, device => device.name === audioIn),
            find(audio.devices, device => device.name === audioOut)
        );
    };

    render() {
        let {engineState} = this.props;
        let {audio} = engineState;
        return <Modal show={audio.state === Lifecycle.Initialized} onHide={this.quit}>
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
                                    {device.name}{" "}({device.maxInputChannels}{" "}channels)
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
                                    {device.name}{" "}({device.maxOutputChannels}{" "}channels)
                                </option>
                            )
                        }
                    </Input>
                </form>
            </Modal.Body>
            <Modal.Footer>
                <Button bsStyle="primary" onClick={this.stream}>Start »</Button>
            </Modal.Footer>
        </Modal>;
    }
}
