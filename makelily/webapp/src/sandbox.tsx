import * as React from "react";
import {Component} from "react";
import {Link} from "react-router";
import {reduce, defer, find, last, findLastIndex} from "lodash";

import {Pitch, Note, Count, BeamType, MxmlAccidental, BarStyleType} from "musicxml-interfaces";
import {buildNote, patchNote} from "musicxml-interfaces/builders";
import {IAny} from "musicxml-interfaces/operations";

import Test, {satieApplication} from "./test";
import {prefix} from "./config";
const STYLES = require("./tests.css");

import {ISong, Application, Patch, Type} from "../../src/index";

const MAX_SAFE_INTEGER = 9007199254740991;

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
    };

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
        this.state.song.setOperations(this.state.operations);
        const doc = this.state.song.getDocument();
        const measureCount = doc.measures.length;
        const previouslyLastMeasure = doc.measures[measureCount - 1];
        const segment = previouslyLastMeasure.parts["P1"].staves[1];
        const barlineIdx = findLastIndex(segment, el => doc.modelHasType(el, Type.Barline));

        const removeDoubleBarline = Patch.createPatch(false, doc,
            previouslyLastMeasure.uuid, "P1",
            part => part.staff(1, staff => staff
                .barline(barline => barline
                    .barStyle(barStyle => barStyle
                        .data(BarStyleType.Regular)
                    )
                ),
                barlineIdx
            )
        );

        const newMeasure: IAny[] = Patch.createPatch(false, doc,
            document => document
                .insertMeasure(measureCount, measure => measure
                    .part("P1", part => part
                        .voice(1, voice => voice
                            .insertChord([
                                note => note
                                    .rest({})
                                    .staff(1)
                                    .noteType(type => type
                                        .duration(Count.Whole)
                                    )
                            ])
                        )
                    )
              )
        );

        let patch = removeDoubleBarline.concat(newMeasure);

        let oldOperations = this.state.oldOperations.concat([this.state.operations.slice()]);
        let operations = this.state.operations.concat(patch);
        operations = this.state.song.setOperations(operations);
        this.setState({operations, oldOperations});
    }
    render() {
        return <div className={STYLES.tests}>
            <p>
                Use this page to test song editing.
            </p>
            <ul style={{display: "flex", listStyleType: "none"}}>
                <li style={{padding: 10}}><a href="javascript:void(0)"
                    onClick={this._setNote.bind(this, Count._32nd)}>32</a></li>
                <li style={{padding: 10}}><a href="javascript:void(0)"
                    onClick={this._setNote.bind(this, Count._16th)}>16</a></li>
                <li style={{padding: 10}}><a href="javascript:void(0)"
                    onClick={this._setNote.bind(this, Count.Eighth)}>8</a></li>
                <li style={{padding: 10}}><a href="javascript:void(0)"
                    onClick={this._setNote.bind(this, Count.Quarter)}>4</a></li>
                <li style={{padding: 10}}><a href="javascript:void(0)"
                    onClick={this._setNote.bind(this, Count.Half)}>2</a></li>
                <li style={{padding: 10}}><a href="javascript:void(0)"
                    onClick={this._setNote.bind(this, Count.Whole)}>1</a></li>
                <li style={{padding: 10}}><a href="javascript:void(0)"
                    onClick={this._setType.bind(this, "N")}>N</a></li>
                <li style={{padding: 10}}><a href="javascript:void(0)"
                    onClick={this._setType.bind(this, "R")}>R</a></li>
                <li style={{padding: 10}}><a href="javascript:void(0)"
                    onClick={this._undo.bind(this)}>Undo</a></li>
                <li style={{padding: 10}}><a href="javascript:void(0)"
                    onClick={this._newMeasure.bind(this)}>+</a></li>
            </ul>
            {this.state.song && this.state.song.toReactElement()}
            <pre style={{fontSize: 8, height: 400, overflow: "scroll"}}>{this.state.song &&
                JSON.stringify(this.state.song.getOperations().slice().reverse(), null, 2)}</pre>
        </div>;
    }
    componentDidMount() {
        const handler = (path: (string | number)[], pitch: Pitch,
                setOperations: (operations: IAny[]) => IAny[],
                isPreview: boolean): boolean => {
            let oldOperations = this.state.oldOperations.concat([this.state.operations.slice()]);
            let operations = this.state.operations.slice();
            setOperations(operations);
            const doc = song.getDocument();
            const measure = find(doc.measures, fmeasure => String(fmeasure.uuid) === path[0]);
            if (!measure || path[1] !== "parts" || !measure.parts[path[2]]) {
                return false;
            }
            const part = measure.parts[path[2]];
            if (path[3] === "staves") {
                const staff = part.staves[parseInt(path[4] as string, 10)];
                if (!staff) {
                    return false;
                }
            } else if (path[3] === "voices") {
                const voice = part.voices[parseInt(path[4] as string, 10)];
                if (!voice) {
                    return false;
                }
                const elIdx = parseInt(path[5] as string, 10);
                const el = voice[elIdx];
                if (!el) {
                    return false;
                }
                const isChord = doc.modelHasType(el, Type.Chord);
                if (!isChord) {
                    return false;
                }
                pitch.alter = 1;
                const chord = el as any as Note[];
                const measureUUID = parseInt(path[0] as string, 10);
                let patch: IAny[];
                if (this.state.type === "N" && chord.length === 1 && chord[0].rest ||
                        this.state.type === "R" && chord.length === 1 && !chord[0].rest) {
                    patch = Patch.createPatch(isPreview, doc, measureUUID, "P1", part => part
                        .voice(1, voice => voice
                            .note(0, note => this.state.type === "R" ?
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
                                    .color(isPreview ? "#cecece" : "#000000"),

                                elIdx
                            )
                        )
                    );
                } else if (this.state.type === "N" && chord.length && !chord[0].rest &&
                                chord[0].noteType.duration !== this.state.note) {
                    patch = Patch.createPatch(isPreview, doc, measureUUID, "P1", part => part
                        .voice(1, voice => voice
                            .note(0, note => note
                                .noteType(noteType => noteType
                                    .duration(this.state.note)
                                )
                                .color(isPreview ? "#cecece": "#000000")
                            ), elIdx
                        )
                    );
                }

                if (patch) {
                    operations = setOperations(operations.concat(patch));
                    if (!isPreview) {
                        this.setState({operations: operations.slice(), oldOperations});
                    }
                    this.forceUpdate();
                    return true;
                }
            }
            return false;
        };
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
            mouseMoveHandler: (path: (string | number)[], pitch: Pitch) => {
                handler(path, pitch, song.previewOperations.bind(song), true);
            },
            mouseClickHandler: (path: (string | number)[], pitch: Pitch) => {
                handler(path, pitch, song.setOperations.bind(song), false);
            },
            musicXML: songTemplate,
            pageClassName: STYLES.page,
            singleLineMode: true,
        });
        this.setState({
            src: songTemplate,
            song: song,
        });
        (window as any)["_song"] = song as any;
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
