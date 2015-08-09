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
import {delay, extend, forEach, times, values} from "lodash";

import {DragonBackend, Connection} from "../backends/spec";
import {register, unregister} from "./runtime";

import WrappedDAWComponent from "./anyComponent";

/**
 * The wrapped DAW component's state must extend IDAWComponentState.
 */
export interface IDAWComponentState {
    /**
     * The ID the Dragon server gave to this effect.
     * Don't modify it.
     */
    _dragonId?: number;

    /**
     * The state of the effect, as presented by the remote server.
     * Don't modify it. Instead, call setRemoteState(...) to request changes.
     */
    remote?: any;
}

/**
 * DAWComponent is an ES7 decorator that gives MIDI/audio superpowers to React components.
 *
 * Defining components
 * ===================
 *  - To define a soundfont (an effect that converts MIDI events to sound) with 2 channels:
 *
 *      @DAWComponent("live.effects.soundfont.Soundfont", 2)
 *      class Synth extends React.Component<Props, State> {
 *          // The decorator adds a setRemoteType method, so let TypeScript know about it.
 *          // Replace SomeTypeGoesHere with the component's actual type.
 *          setRemoteState: (remoteState: SomeTypeGoesHere) => void;
 *
 *          // ...
 *      }
 *
 *    The symbol name (in this case "live.effects.soundfont.Soundfont") must be the symbol
 *    of an effect known by the backend. A list of available symbols can be found in
 *    `engine.factories` on the DragonApp component.
 *
 *  - DAWComponents require a render() function. Usually, this should be a simple passthrough.
 *    For larger applications, it's a good idea to seperate sound and UI.
 *
 *      render() {
 *          return <span>{this.props.children}</span>;
 *      }
 *
 * Environment
 * ===========
 *  - Dragon is injected into the component through React context (For an excellent overview
 *    of context, see http://www.tildedave.com/2014/11/15/introduction-to-contexts-in-react-js.html).
 *    DragonApp sets Dragon, but you can set your own API-compatible Dragon implementation for
 *    testing or running in non-Electron environments.
 *  - The outputs and inputs are also determined by context. Parent components represent OUTPUTS and
 *    child components represent inputs. This is probably initially unintuitive, but fits more naturally
 *    with the DOM where child elements affect how parent elements are rendered.
 *
 *    For example, if Synth is a DOMComponent, an application which takes all MIDI events and plays
 *    them with a piano sound on the default audio card's default output could look like:
 *
 *        <DragonApp engine={DragonRT}>
 *            <PhysicalAudioOutput default>
 *                <Synth program="Acoustic Grand Piano">
 *                    <PhysicalMIDIInput all />
 *                </Synth>
 *            </PhysicalAudioOuput>
 *        </DragonApp>
 *
 * Lifecycle
 * =========
 *  - On componentWillMount, an effect is created on the realtime thread.
 *  - On componentWillUnmount, the effect is destroyed.
 *  - TIP: To avoid accidental unmounting and remounting, make sure to give component instances keys!
 *
 * State
 * =====
 *  - The state of the effect is exposed in `state.remote`. This object is frozen.
 *    Don't modify it.
 *  - To request changes to `state.remote`, call `this.setRemoteState(...)`
 *
 */
export default function DAWComponent<P, S extends IDAWComponentState>(symbol: string, channels: number) {
    return function decorator(component: {prototype: WrappedDAWComponent<P, IDAWComponentState>, contextTypes?: any,
            childContextTypes?: any}) {
        let originalComponentWillMount = component.prototype.componentWillMount;
        component.prototype.componentWillMount = function dragonComponentWillMountWrapper() {
            let self = this as WrappedDAWComponent<P, IDAWComponentState>;
            let dragonBackend: DragonBackend = self.context.dragonBackend;
            let _dragonId = dragonBackend.create({channels, symbol});

            self.setState({_dragonId}, () => self.adjust());
            register(_dragonId, (msg: any) => {
                if (msg.exception) {
                    console.warn(msg);
                } else {
                    self.setState({remote: Object.freeze(msg)});
                }
            });

            if (originalComponentWillMount) {
                originalComponentWillMount.call(self);
            }
        };

        let originalComponentWillUnmount = component.prototype.componentWillUnmount;
        component.prototype.componentWillUnmount = function dragonComponentWillUnmountWrapper() {
            let self = this as WrappedDAWComponent<P, IDAWComponentState>;
            self.adjust();
            let dragonBackend: DragonBackend = self.context.dragonBackend;
            let id = this.state._dragonId;

            let currentConnections: {[key: string]: Connection} = this.currentConnections;
            forEach(values(currentConnections) as Connection[], connection => {
                dragonBackend.disconnect(connection);
            });
            this.currentConnections = {};

            unregister(id);

            // wait until this is completely unmounted.
            delay(function() {
                dragonBackend.destroy({id});
            }, 100);

            if (originalComponentWillUnmount) {
                originalComponentWillUnmount.call(self);
            }
        };

        component.prototype.setRemoteState = function(remoteState: any) {
            let self = this as WrappedDAWComponent<P, IDAWComponentState>;
            let dragonBackend: DragonBackend = self.context.dragonBackend;

            dragonBackend.toEffect({
                id: self.state._dragonId,
                name: undefined,
                audioWidth: undefined,
                connectivity: undefined,
                isHardware: undefined,
                isMidi: undefined,
                type: undefined
            }, remoteState);
        };

        let originalRender = component.prototype.render;
        component.prototype.render = function() {
            component.prototype.adjust();
            return originalRender.call(this);
        };

        component.prototype.adjust = function() {
            if (!this.currentConnections) {
                this.currentConnections = {};
            }
            let currentConnections: {[key: string]: Connection} = this.currentConnections;
            if (!this.context) {
                return;
            }
            let self = this as WrappedDAWComponent<P, IDAWComponentState>;
            let dragonBackend: DragonBackend = self.context.dragonBackend;
            let dragonOutputs: {[outChan: number]: {id: number; inChan: number}[]} = self.context.dragonOutputs;

            let dragonInputs: {[outChan: number]: {id: number; inChan: number}[]} = {};
            dragonInputs[-1] = [{
                id: self.state._dragonId,
                inChan: -1
            }];

            times(channels, chan => {
                dragonInputs[chan] = [{
                    id: self.state._dragonId,
                    inChan: chan
                }];
            });

            let visited: {[key: string]: boolean} = {};

            forEach(dragonInputs, (inputs: {id: number; inChan: number}[], someChanKey: string) => {
                let someChan = parseInt(someChanKey, 10);
                if (!dragonOutputs[someChan]) {
                    return;
                }
                dragonOutputs[someChan].forEach(outputs => {
                    inputs.forEach(input => {
                        let key = `${input.id}_${input.inChan}_${outputs.id}_${outputs.inChan}`;
                        visited[key] = true;
                        if (!currentConnections[key]) {
                            currentConnections[key] = {
                                from: input.id,
                                fromChannel: input.inChan,
                                to: outputs.id,
                                toChannel: outputs.inChan
                            };
                            dragonBackend.connect(currentConnections[key]);
                        }
                    });
                });
            });

            forEach(currentConnections, (connection, key) => {
                if (!visited[key]) {
                    dragonBackend.disconnect(connection);
                    delete this.currentConnections[key];
                }
            });
        };

        component.prototype.getChildContext = function() {
            let self = this as WrappedDAWComponent<P, IDAWComponentState>;
            let dragonOutputs: {[outChan: number]: {id: number; inChan: number}[]} = {};
            dragonOutputs[-1] = [{
                id: self.state._dragonId,
                inChan: -1
            }];

            times(channels, chan => {
                dragonOutputs[chan] = [{
                    id: self.state._dragonId,
                    inChan: chan
                }];
            });

            return {dragonOutputs};
        };

        component.contextTypes = extend(component.contextTypes || {}, {
            dragonBackend: React.PropTypes.any,
            dragonEngineState: React.PropTypes.any,
            dragonOutputs: React.PropTypes.object
        });

        component.childContextTypes = extend(component.contextTypes || {}, {
            dragonOutputs: React.PropTypes.object
        });
    };
}
