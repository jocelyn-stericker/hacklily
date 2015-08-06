
import App from "./vendor/app";
import Dialog from "./vendor/dialog";
import remote from "./vendor/remote";

import React = require("react");
import {times, forEach, values, delay} from "lodash";

import _Dragon = require("./vendor/bridge");
import {Connection, connect, disconnect} from "./vendor/bridge";
import {extend} from "lodash";

import WrappedDAWComponent from "./anyComponent";

/**
 * 
 */
export interface IDAWState {
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
 *    of an effect in libdragon. A list of available symbols can be found in `engine.factories`
 *    on the DragonApp component.
 * 
 *  - DAWComponents define a simple passthrough render() function if a render function is not already
 *    defined in the component. Simple applications may wish to define `render()` methods which also
 *    render content.
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
export default function DAWComponent<P, S extends IDAWState>(symbol: string, channels: number) {
    return function decorator(component: {prototype: WrappedDAWComponent<P, IDAWState>, contextTypes?: any,
            childContextTypes?: any}) {
        let originalComponentWillMount = component.prototype.componentWillMount;
        component.prototype.componentWillMount = function dragonComponentWillMountWrapper() {
            let self = this as WrappedDAWComponent<P, IDAWState>;
            let Dragon: typeof _Dragon = self.context.Dragon;
            let _dragonId = Dragon.create({channels, symbol});

            self.setState({_dragonId}, () => self.adjust());
            Dragon.register(_dragonId, (msg: any) => {
                if (msg.exception) {
                    console.warn(msg);
                } else {
                    self.setState({remote: Object.freeze(msg)})
                }
            });

            if (originalComponentWillMount) {
                originalComponentWillMount.call(self);
            }
        }

        let originalComponentWillUnmount = component.prototype.componentWillUnmount;
        component.prototype.componentWillUnmount = function dragonComponentWillUnmountWrapper() {
            let self = this as WrappedDAWComponent<P, IDAWState>;
            self.adjust();
            let Dragon: typeof _Dragon = self.context.Dragon;
            let id = this.state._dragonId;
            
            let currentConnections: {[key: string]: Connection} = this.currentConnections;
            forEach(values(currentConnections) as Connection[], connection => {
                disconnect(connection);
            });
            this.currentConnections = {};

            Dragon.unregister(id);
            
            // Wait until this is completely unmounted.
            delay(function() {
                Dragon.destroy({id});
            }, 100);

            if (originalComponentWillUnmount) {
                originalComponentWillUnmount.call(self);
            }
        }
        
        component.prototype.setRemoteState = function(remoteState: any) {
            let self = this as WrappedDAWComponent<P, IDAWState>;
            let Dragon: typeof _Dragon = self.context.Dragon;

            Dragon.toEffect({
                id: self.state._dragonId,
                name: undefined,
                audioWidth: undefined,
                connectivity: undefined,
                isHardware: undefined,
                isMidi: undefined,
                type: undefined,
            }, remoteState);
        }
        
        let originalRender = component.prototype.render;
        component.prototype.render = function() {
            component.prototype.adjust();
            return originalRender.call(this);
        }
        
        component.prototype.adjust = function() {
            if (!this.currentConnections) {
                this.currentConnections = {};
            }
            let currentConnections: {[key: string]: Connection} = this.currentConnections;
            if (!this.context) {
                return;
            }
            let self = this as WrappedDAWComponent<P, IDAWState>;
            let dragonOutputs: {[outChan: number]: {id: number; inChan: number}[]} = self.context.dragonOutputs;
            
            let dragonInputs: {[outChan: number]: {id: number; inChan: number}[]} = {};
            dragonInputs[-1] = [{
                id: self.state._dragonId,
                inChan: -1,
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
                                toChannel: outputs.inChan,
                            }
                            connect(currentConnections[key]);
                        }
                    })
                });
            });
            
            forEach(currentConnections, (connection, key) => {
                if (!visited[key]) {
                    disconnect(connection);
                    delete this.currentConnections[key];
                }
            });
        }
        
        component.prototype.getChildContext = function() {
            let self = this as WrappedDAWComponent<P, IDAWState>;
            let dragonOutputs: {[outChan: number]: {id: number; inChan: number}[]} = {};
            dragonOutputs[-1] = [{
                id: self.state._dragonId,
                inChan: -1,
            }];
            
            times(channels, chan => {
                dragonOutputs[chan] = [{
                    id: self.state._dragonId,
                    inChan: chan
                }];
            });

            return {dragonOutputs};
        }

        component.contextTypes = extend(component.contextTypes || {}, {
            Dragon: React.PropTypes.any,
            dragonEngineState: React.PropTypes.any,
            dragonOutputs: React.PropTypes.object
        });
        
        component.childContextTypes = extend(component.contextTypes || {}, {
            dragonOutputs: React.PropTypes.object
        });
    }
}
