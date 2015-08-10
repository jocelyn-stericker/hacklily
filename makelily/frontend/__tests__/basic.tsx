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

/// <reference path="../../uitest/vendor/typings/tsd.d.ts" />

// Create a DOM environment in node.
import jsdom = require("jsdom");
(global as any).document = jsdom.jsdom(`<!doctype html><html><body><div id="yolo"></div></body></html>`);
(global as any).window = (document as any).defaultView;
(global as any).navigator = (window as any).navigator;

import React = require("react");
import ReactDOM = require("react-dom");
import {delay} from "lodash";

let TestUtils = require("react-addons-test-utils") as any;

import DragonApp from "../dragonApp";
import DummyBackend, {Test as DragonTest} from "../../backends/dummy/dummy";
import MidiBridge from "../midiBridge";
import PhysicalInput from "../physicalInput";
import PhysicalOutput from "../physicalOutput";
import Synth from "../synth";

import {config as chaiConfig, expect} from "chai";
chaiConfig.truncateThreshold = 0; // disable truncating

describe("audio engine frontend", function() {
    it("supports a basic chain", function(done) {
        let rootNode = document.getElementById("yolo");
        let fn = (): void => {};

        ReactDOM.render(
            <DragonApp backend={DummyBackend} onMessage={fn} onStateChanged={fn}>
                <PhysicalOutput all audio>
                    <PhysicalInput all audio />
                </PhysicalOutput>
            </DragonApp>,
            document.getElementById("yolo"));

        delay(function() {
            let error: Error;
            try {
                expect(DragonTest.audioFrame()).to.deep.equal({
                    audio: {
                        "Dummy Output (left)": "^ | Dummy Input (left)",
                        "Dummy Output (right)": "^ | Dummy Input (right)"
                    },
                    midi: {
                        "Dummy MIDI Output": []
                    }
                });
            } catch(err) {
                error = err;
            }

            ReactDOM.unmountComponentAtNode(document.getElementById("yolo"));
            error ? done(error) : done();
        }, 10);
    });

    it("supports soundfonts", function(done) {
        let rootNode = document.getElementById("yolo");
        let fn = (): void => {};

        ReactDOM.render(
            <DragonApp backend={DummyBackend} onMessage={fn} onStateChanged={fn}>
                <PhysicalOutput all audio>
                    <Synth channels={[{program: 12}, {program: 13}]} soundfont="yolo" >
                        <PhysicalInput all midi />
                    </Synth>
                </PhysicalOutput>
            </DragonApp>,
            document.getElementById("yolo"));

        delay(function() {
            let error: Error;
            try {
                expect(DragonTest.midiFrame({type: "NOTE_ON", note: 80, velocity: 128, channel: 0})).to.deep.equal({
                    audio: {
                        "Dummy Output (left)": "^ | NOTE_ON(Program 12, 80, 128)",
                        "Dummy Output (right)": "^ | NOTE_ON(Program 12, 80, 128)"
                    },
                    midi: {
                        "Dummy MIDI Output": []
                    }
                });

                expect(DragonTest.midiFrame({type: "NOTE_ON", note: 80, velocity: 128, channel: 1})).to.deep.equal({
                    audio: {
                        "Dummy Output (left)": "^ | NOTE_ON(Program 13, 80, 128)",
                        "Dummy Output (right)": "^ | NOTE_ON(Program 13, 80, 128)"
                    },
                    midi: {
                        "Dummy MIDI Output": []
                    }
                });
            } catch(err) {
                error = err;
            }

            ReactDOM.unmountComponentAtNode(document.getElementById("yolo"));
            error ? done(error) : done();
        }, 10);
    });

    it("supports multiple inputs", function(done) {
        let rootNode = document.getElementById("yolo");
        let fn = (): void => {};

        class Yolo extends React.Component<any, any> {
            render() {
                return <DragonApp backend={DummyBackend} onMessage={fn} onStateChanged={fn}>
                    <PhysicalOutput all audio>
                        <Synth channels={[{program: 12}, {program: 13}]} soundfont="yolo" >
                            <PhysicalInput all midi />
                            <MidiBridge ref="midiBridge" channel={1} />
                        </Synth>
                        <MidiBridge channel={1} />
                    </PhysicalOutput>
                </DragonApp>;
            }
            triggerNote() {
                (this.refs["midiBridge"] as any).noteOn(90, 60);
            }
        }

        let root = ReactDOM.render(<Yolo />, document.getElementById("yolo"));
        let triggerNote = () => (root as any).triggerNote();

        delay(function() {
            let error: Error;
            try {
                expect(DragonTest.midiFrame({type: "NOTE_ON", note: 80, velocity: 128, channel: 0})).to.deep.equal({
                    audio: {
                        "Dummy Output (left)": "<^ | MidiBridge, ^ | MidiBridge | NOTE_ON(Program 12, 80, 128)>",
                        "Dummy Output (right)": "<^ | MidiBridge, ^ | MidiBridge | NOTE_ON(Program 12, 80, 128)>"
                    },
                    midi: {
                        "Dummy MIDI Output": []
                    }
                });

                expect(DragonTest.midiFrameBridged(triggerNote)).to.deep.equal({
                    audio: {
                        "Dummy Output (left)": "<^ | MidiBridge, ^ | MidiBridge | NOTE_ON(Program 13, 90, 60)>",
                        "Dummy Output (right)": "<^ | MidiBridge, ^ | MidiBridge | NOTE_ON(Program 13, 90, 60)>"
                    },
                    midi: {
                        "Dummy MIDI Output": []
                    }
                });
            } catch(err) {
                error = err;
            }

            ReactDOM.unmountComponentAtNode(document.getElementById("yolo"));
            error ? done(error) : done();
        }, 100);
    });
});
