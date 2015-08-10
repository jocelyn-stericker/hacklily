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
import {reduce, forEach, values} from "lodash";

import {IDragonBackend, IEngineState, IEffect, IConnection} from "../backends/spec";

export interface IProps {
    audio?: boolean;
    midi?: boolean;

    all?: boolean;
    inputs?: IEffect[];
    children?: any;
    key?: any;
}
export interface IState {
    engineState: IEngineState;
}

/**
 * Must have a DragonEngine ancestor. For it to be useful, should have some
 * kind of output parent.
 */
class PhysicalInput extends React.Component<IProps, IState> {

    context: {
        dragonEngineState: IEngineState;
        dragonBackend: IDragonBackend;
        dragonOutputs: {[input: number]: {id: number; inChan: number}[]};
    };

    currentConnections: {[key: string]: IConnection};

    adjust() {
        let dragonOutputs = this.context.dragonOutputs;
        let dragonInputs: {[outChan: number]: {id: number; inChan: number}[]};

        if (!this.currentConnections) {
            this.currentConnections = {};
        }

        if (!dragonOutputs || !this.context.dragonEngineState) {
            this.clear();
            return;
        }

        if (this.props.all && this.props.inputs) {
            throw new Error("In <PhysicalOutput />, all and outputs are mutually exclusive.");
        }
        if (this.props.all) {
            if (!this.props.audio === !this.props.midi) {
                throw new Error("In <PhysicalInput />, if the 'all' prop is set, you must also either " +
                    "set the 'audio' or 'midi' prop, but not both.");
            }
            let devices = this.context.dragonEngineState.store.filter(
                effect => effect.isHardware &&
                    effect.connectivity !== "Output" &&
                    effect.isMidi !== this.props.audio &&
                    effect.isMidi === !!this.props.midi
            );

            let lastAudioChannelOut = -1;
            dragonInputs = reduce(devices, (inputs, input) => {
                let chan = input.isMidi ? -1 : ++lastAudioChannelOut;
                inputs[chan] = inputs[chan] || [];
                inputs[chan].push({
                    id: input.id,
                    inChan: input.isMidi ? -1 : 0
                });
                return inputs;
            }, {} as {[channel: number]: {id: number; inChan: number}[]});
        } else if (this.props.inputs) {
            if (this.props.audio || this.props.midi) {
                throw new Error("In <PhysicalInput />, the 'audio' and 'midi' props are only valid if " +
                    "the 'all' prop is set. 'all' and 'outputs' are mutually exclusive");
            }
            let lastAudioChannelOut = -1;

            dragonInputs = reduce(this.props.inputs, (inputs, input) => {
                let chan = input.isMidi ? -1 : ++lastAudioChannelOut;
                inputs[chan] = inputs[chan] || [];
                inputs[chan].push({
                    id: input.id,
                    inChan: 0
                });
                return inputs;
            }, {} as {[input: number]: {id: number; inChan: number}[]});
        } else {
            throw new Error("In <PhysicalInput />, either the 'all' or 'inputs' props must be set");
        }

        let visited: {[key: string]: boolean} = {};

        forEach(dragonInputs, (inputs: {id: number; inChan: number}[], someChanKey: string) => {
            let someChan = parseInt(someChanKey, 10);
            dragonOutputs[someChan].forEach(outputs => {
                inputs.forEach(input => {
                    let key = `${input.id}_${input.inChan}_${outputs.id}_${outputs.inChan}`;
                    visited[key] = true;
                    if (!this.currentConnections[key]) {
                        this.currentConnections[key] = {
                            from: input.id,
                            fromChannel: input.inChan,
                            to: outputs.id,
                            toChannel: outputs.inChan
                        };
                        this.context.dragonBackend.connect(this.currentConnections[key]);
                    }
                });
            });
        });


        forEach(this.currentConnections, (connection, key) => {
            if (!visited[key]) {
                this.context.dragonBackend.disconnect(connection);
                delete this.currentConnections[key];
            }
        });
    }

    componentWillUnmount() {
        this.clear();
    }

    clear() {
        forEach(values(this.currentConnections) as IConnection[], connection => {
            this.context.dragonBackend.disconnect(connection);
        });
        this.currentConnections = {};
    }

    render() {
        this.adjust();

        // we for now actually render something, but don't rely on it.
        return <span>
            {this.props.children}
        </span>;
    }
}

module PhysicalInput {
    export let propTypes = {
        audio: React.PropTypes.bool,
        midi: React.PropTypes.bool,

        all: React.PropTypes.bool,
        outputs: React.PropTypes.object
    };

    export let contextTypes = {
        dragonEngineState: React.PropTypes.any,
        dragonOutputs: React.PropTypes.object,
        dragonBackend: React.PropTypes.any
    };
}

export default PhysicalInput;
