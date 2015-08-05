/**
 * Dragon: Declarative Audio and MIDI
 * 
 * (C) Josh Netterfield 2015.
 */

import App from "./vendor/app";
import Dialog from "./vendor/dialog";
import {TransientMsg, EngineState, Lifecycle} from "./vendor/bridge";

import React = require("react");
import {defer, filter, map, find} from "lodash";

import _Dragon = require("./vendor/bridge");
import {extend} from "lodash";

let stateIdx = -1;

class DragonEngine extends React.Component<{
        engine?: typeof _Dragon;
        onMessage?: (msg: TransientMsg) => void;
        onStateChanged?: (state: EngineState) => void;
        children?: any;
    }, {
        engineState: EngineState;
    }> {
        
    componentWillMount() {
        this.props.engine.run((msg: TransientMsg, engineState: EngineState) => {
            if (msg) {
                this.props.onMessage(msg);
            } else if (engineState) {
                if (engineState.stateIdx < stateIdx) {
                    return;
                }
                stateIdx = engineState.stateIdx;
                setTimeout(() => {
                    this.setState({engineState});
                    this.props.onStateChanged(engineState);
                });
            }
        });
    }
    
    componentWillUnmount() {
        this.props.engine.stop();
    }
    
    getChildContext() {
        return {
            Dragon: this.props.engine,
            dragonEngineState: this.state.engineState
        };
    }
    
    render() {
        // We for now actually render something, but don't rely on it.
        if (!this.state.engineState || this.state.engineState.audio.state !== Lifecycle.Streaming) {
            return null;
        }
        return <span>
            {this.props.children}
        </span>;
    }
    
    constructor() {
        super();
        this.state = {
            engineState: null
        };
    }
}

module DragonEngine {
    export let propTypes = {
        onMessage: React.PropTypes.func.isRequired,
        onStateChanged: React.PropTypes.func.isRequired
    }
    
    export let childContextTypes = {
        Dragon: React.PropTypes.any,
        dragonEngineState: React.PropTypes.any
    };
}

export default DragonEngine;