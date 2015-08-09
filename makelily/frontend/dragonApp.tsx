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

import {TransientMsg, EngineState, Lifecycle, DragonBackend} from "../backends/spec";
import {run} from "./runtime";

let stateIdx = -1;

export interface IProps {
    backend: DragonBackend;
    onMessage?: (msg: TransientMsg) => void;
    onStateChanged?: (state: EngineState) => void;
    children?: any;
}
export interface IState {
    engineState: EngineState;
}

class DragonEngine extends React.Component<IProps, IState> {
    componentWillMount() {
        run(this.props.backend, (msg: TransientMsg, engineState: EngineState) => {
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
        this.props.backend.stop();
    }

    getChildContext() {
        return {
            dragonBackend: this.props.backend,
            dragonEngineState: this.state.engineState
        };
    }

    render() {
        // we for now actually render something, but don't rely on it.
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
    };

    export let childContextTypes = {
        dragonBackend: React.PropTypes.any,
        dragonEngineState: React.PropTypes.any
    };
}

export default DragonEngine;
