/**
 * Dragon: Declarative Audio and MIDI
 * 
 * (C) Josh Netterfield 2015.
 */

import App from "./vendor/app";
import Dialog from "./vendor/dialog";
import {connect, disconnect, EngineState, Effect, Connection} from "./vendor/bridge";

import React = require("react");
import {reduce, forEach, values} from "lodash";

/**
 * Must have a DragonEngine ancestor. For it to be useful, should have some
 * kind of output parent.
 */
class PhysicalInput extends React.Component<{
        audio?: boolean;
        midi?: boolean;

        all?: boolean;
        inputs?: Effect[];
        children?: any;
    }, {
        engineState: EngineState;
    }> {

    context: {
        dragonEngineState: EngineState;
        dragonOutputs: {[input: number]: {id: number; inChan: number}[]};
    }
    
    currentConnections: {[key: string]: Connection};
    
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
                            toChannel: outputs.inChan,
                        }
                        connect(this.currentConnections[key]);
                    }
                })
            });
        });
        
        
        forEach(this.currentConnections, (connection, key) => {
            if (!visited[key]) {
                disconnect(connection);
                delete this.currentConnections[key];
            }
        });
    }
    
    componentWillUnmount() {
        this.clear();
    }
    
    clear() {
        forEach(values(this.currentConnections) as Connection[], connection => {
            disconnect(connection);
        });
        this.currentConnections = {};
    }
    
    render() {
        this.adjust();
        
        // We for now actually render something, but don't rely on it.
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
        outputs: React.PropTypes.object,
    }
    
    export let contextTypes = {
        dragonEngineState: React.PropTypes.any,
        dragonOutputs: React.PropTypes.object
    }
}

export default PhysicalInput;