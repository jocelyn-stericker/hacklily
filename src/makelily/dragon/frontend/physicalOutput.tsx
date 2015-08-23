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
import {reduce} from "lodash";

import {IEngineState, IEffect} from "../backends/spec";

export interface IProps {
    audio?: boolean;
    midi?: boolean;

    all?: boolean;
    outputs?: IEffect[];
    children?: any;
}

export interface IState {
    engineState: IEngineState;
}

/**
 * Must have a DragonEngine ancestor.
 *
 * Children or grandchildren (or so on) that capture audio or MIDI will receive
 * data from to the selected output(s).
 */
class PhysicalOutput extends React.Component<IProps, IState> {

    context: {
        dragonEngineState: IEngineState;
    };

    getChildContext() {
        if (!this.context.dragonEngineState) {
            return {};
        }
        let dragonOutputs: {[outChan: number]: {id: number; inChan: number}[]};

        if (this.props.all && this.props.outputs) {
            throw new Error("In <PhysicalOutput />, all and inputs are mutually exclusive.");
        }
        if (this.props.all) {
            if (!this.props.audio === !this.props.midi) {
                throw new Error("In <PhysicalOutput />, if the 'all' prop is set, you must also either " +
                    "set the 'audio' or 'midi' prop, but not both. If you want both Audio and MIDI, " +
                    "you can nest a MIDI below an Audio PhysicalInputs.");
            }
            let devices = this.context.dragonEngineState.store.filter(
                effect => effect.isHardware &&
                    effect.connectivity === "Output" &&
                    effect.isMidi !== this.props.audio &&
                    effect.isMidi === !!this.props.midi
            );

            let lastAudioChannelOut = -1;
            dragonOutputs = reduce(devices, (inputs, input) => {
                let chan = input.isMidi ? -1 : ++lastAudioChannelOut;
                inputs[chan] = inputs[chan] || [];
                inputs[chan].push({
                    id: input.id,
                    inChan: 0
                });
                return inputs;
            }, {} as {[input: number]: {id: number; inChan: number}[]});
        } else if (this.props.outputs) {
            if (this.props.audio || this.props.midi) {
                throw new Error("In <PhysicalOutput />, the 'audio' and 'midi' props are only valid if " +
                    "the 'all' prop is set. 'all' and 'inputs' are mutually exclusive");
            }
            let lastAudioChannelOut = -1;

            dragonOutputs = reduce(this.props.outputs, (inputs, input) => {
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

        return {dragonOutputs};
    }

    render() {
        // we for now actually render something, but don't rely on it.
        return <span>
            {this.props.children}
        </span>;
    }
}

module PhysicalOutput {
    export let propTypes = {
        audio: React.PropTypes.bool,
        midi: React.PropTypes.bool,

        all: React.PropTypes.bool,
        outputs: React.PropTypes.object
    };

    export let contextTypes = {
        dragonEngineState: React.PropTypes.any
    };

    export let childContextTypes = {
        dragonOutputs: React.PropTypes.object
    };
}

export default PhysicalOutput;
