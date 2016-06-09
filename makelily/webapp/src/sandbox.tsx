import * as React from "react";
import {Component} from "react";
import {Link} from "react-router";
import {ISong, Application, Patch, Type} from "../../src/index";
import {reduce, defer, find} from "lodash";

import {Pitch, Note, Count, BeamType, MxmlAccidental} from "musicxml-interfaces";
import {buildNote} from "musicxml-interfaces/builders";
import {IAny} from "musicxml-interfaces/operations";

import Test, {satieApplication} from "./test";
import {prefix} from "./config";
const STYLES = require("./tests.css");

interface IState {
    src?: string;
    error?: Error;
    song?: ISong;
    operations?: IAny[];
    oldOperations?: IAny[][];
    note?: Count;
    type?: "N" | "R";
}

const songTemplate = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.0 Partwise//EN"
                                "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise>
  <movement-title>Satie Sandbox</movement-title>
  <identification>
    <miscellaneous>
      <miscellaneous-field name="description">
        A song created at https://nettek.ca/satie
      </miscellaneous-field>
    </miscellaneous>
  </identification>
  <part-list>
    <score-part id="P1">
      <part-name>MusicXML Part</part-name>
    </score-part>
  </part-list>
  <!--=========================================================-->
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key>
          <fifths>-3</fifths>
          <mode>minor</mode>
        </key>
        <time symbol="common">
          <beats>4</beats>
          <beat-type>4</beat-type>
        </time>
        <clef>
          <sign>G</sign>
          <line>2</line>
        </clef>
      </attributes>
      <note>
        <rest measure="yes" />
        <duration>4</duration>
        <voice>1</voice>
        <type>whole</type>
      </note>
    </measure>
    <measure number="2">
      <note>
        <rest measure="yes" />
        <duration>4</duration>
        <voice>1</voice>
        <type>whole</type>
      </note>
    </measure>
    <measure number="3">
      <note>
        <rest measure="yes" />
        <duration>4</duration>
        <voice>1</voice>
        <type>whole</type>
      </note>
    </measure>
  </part>
</score-partwise>`;

class Tests extends Component<{params: {id: string}}, IState> {
    state: IState = {
        src: null,
        error: null,
        operations: [],
        oldOperations: [[]],
        song: null,
        note: Count.Eighth,
        type: "N",
    }
    private _setNote(note: number) {
        this.setState({
            note,
        });
    }
    private _setType(type: "N" | "R") {
        this.setState({
            type,
        });
    }
    private _undo() {
        let old = this.state.oldOperations.pop();
        this.state.song.setOperations(old);
        this.state.operations = old.slice();
        this.forceUpdate();
    }
    private _newMeasure() {
        let patch: IAny[] = [
            {
                li: {
                    uuid: Math.floor(Math.random() * 9007199254740991),
                    newParts: {
                        "P1": {
                            voices: [],
                            staves: [],
                        }
                    },
                },
                p: ["measures", 0],
            }
        ];
        let ns: any = patch[0].li.newParts.P1.staves[1] = [];
        ns.owner = 1;
        ns.ownerType = 1; // HACK HACK
        ns.divisions = 4;
        ns.part = "P1";

        let nv: any = patch[0].li.newParts.P1.voices[1] = [
            [buildNote(note => note.rest({}).noteType(type => type.duration(Count.Whole)))]
        ];
        nv.owner = 1;
        nv.ownerType = 0; // HACK HACK
        nv.divisions = 4;
        nv.part = "P1";
        
        let oldOperations = this.state.oldOperations.concat([this.state.operations.slice()]);
        this.state.song.setOperations(this.state.operations.concat(patch));
        this.setState({oldOperations});
    }
    render() {
        return <div className={STYLES.tests}>
            <p>
                Use this page to test song editing.
            </p>
            <pre style={{fontSize: 8, height: 400, overflow: "scroll"}}>{this.state.song &&
                JSON.stringify(this.state.song.getOperations().slice().reverse(), null, 2)}</pre>
            <ul style={{display: "flex", listStyleType: "none"}}>
                <li style={{padding: 10}}><a href="javascript:void(0)" onClick={this._setNote.bind(this, Count._32nd)}>32</a></li>
                <li style={{padding: 10}}><a href="javascript:void(0)" onClick={this._setNote.bind(this, Count._16th)}>16</a></li>
                <li style={{padding: 10}}><a href="javascript:void(0)" onClick={this._setNote.bind(this, Count.Eighth)}>8</a></li>
                <li style={{padding: 10}}><a href="javascript:void(0)" onClick={this._setNote.bind(this, Count.Quarter)}>4</a></li>
                <li style={{padding: 10}}><a href="javascript:void(0)" onClick={this._setNote.bind(this, Count.Half)}>2</a></li>
                <li style={{padding: 10}}><a href="javascript:void(0)" onClick={this._setNote.bind(this, Count.Whole)}>1</a></li>
                <li style={{padding: 10}}><a href="javascript:void(0)" onClick={this._setType.bind(this, "N")}>N</a></li>
                <li style={{padding: 10}}><a href="javascript:void(0)" onClick={this._setType.bind(this, "R")}>R</a></li>
                <li style={{padding: 10}}><a href="javascript:void(0)" onClick={this._undo.bind(this)}>Undo</a></li>
                <li style={{padding: 10}}><a href="javascript:void(0)" onClick={this._newMeasure.bind(this)}>+</a></li>
            </ul>
            {this.state.song && this.state.song.toReactElement()}
        </div>;
    }
    componentDidMount() {
        const handler = (path: (string | number)[], pitch: Pitch, setOperations: (operations: IAny[]) => void, isPreview: boolean) => {
            setOperations(this.state.operations);
            const doc = song.getDocument();
            const measure = find(doc.measures, fmeasure => String(fmeasure.uuid) === path[0]);
            if (!measure || path[1] !== "parts" || !measure.parts[path[2]]) {
                return;
            }
            const part = measure.parts[path[2]];
            if (path[3] === "staves") {
                const staff = part.staves[parseInt(path[4] as string, 10)];
                if (!staff) {
                    return;
                }
            } else if (path[3] === "voices") {
                const voice = part.voices[parseInt(path[4] as string, 10)];
                if (!voice) {
                    return;
                }
                const elIdx = parseInt(path[5] as string, 10);
                const el = voice[elIdx];
                if (!el) {
                    return;
                }
                const isChord = doc.modelHasType(el, Type.Chord);
                if (!isChord) {
                    return;
                }
                pitch.alter = 1;
                const chord = el as any as Note[];
                if (this.state.type === "N" && chord.length === 1 && chord[0].rest ||
                        this.state.type === "R" && chord.length === 1 && !chord[0].rest) {
                    const measureUUID = parseInt(path[0] as string, 10);
                    let patch = Patch.createPatch(isPreview, doc, measureUUID, "P1", part => part
                        .voice(1, voice => voice
                            .note(elIdx, 0, song.getDocument(), note => this.state.type === "R" ?
                                note
                                    .pitch(null)
                                    .dots([])
                                    .noteType(noteType => noteType
                                        .duration(this.state.note)
                                    )
                                    .color(isPreview ? "#cecece" : "#000000") :
                                note
                                    .pitch(pitch)
                                    .dots([])
                                    .noteType(noteType => noteType
                                        .duration(this.state.note)
                                    )
                                    .accidental(accidental => accidental
                                        .accidental(MxmlAccidental.Sharp)
                                    )
                                    .color(isPreview ? "#cecece" : "#000000")
                            )
                        )
                    );
                    setOperations(this.state.operations.concat(patch));
                } else {
                    setOperations(this.state.operations);
                }
            }
        }
        const song = satieApplication.newSong({
            errorHandler: (err) => {
                console.warn(err);
                defer(() => {
                    this.setState({
                        error: err,
                        src: songTemplate,
                    });
                });
            },
            changeHandler: () => {
                this.forceUpdate();
            },
            onOperationsAppended: (ops: IAny[], isPreview: boolean) => {
                if (!isPreview) {
                    this.state.operations = this.state.operations.concat(ops);
                }
            },
            mouseMoveHandler: (path: (string | number)[], pitch: Pitch) => {
                handler(path, pitch, song.previewOperations.bind(song), true);
            },
            mouseClickHandler: (path: (string | number)[], pitch: Pitch) => {
                let oldOperations = this.state.oldOperations.concat([this.state.operations.slice()]);
                handler(path, pitch, song.setOperations.bind(song), false);
                this.setState({oldOperations});
            },
            musicXML: songTemplate,
            pageClassName: STYLES.page,
            singleLineMode: true,
        });
        this.setState({
            src: songTemplate,
            song: song,
        });
    }
}

module Tests {
    export class Header extends Component<{params: {id: string}}, void> {
        render() {
            return <span>Satie &ndash; Sandbox</span>;
        }
    }
}

export default Tests;
