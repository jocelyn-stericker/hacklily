import * as React from "react";
import {Component} from "react";
import {Link} from "react-router";
import {reduce, defer, find, last, findLastIndex, isEqual} from "lodash";

import {Pitch, Note, Count, BeamType, MxmlAccidental, BarStyleType} from "musicxml-interfaces";
import {buildNote, patchNote} from "musicxml-interfaces/builders";
import {IAny} from "musicxml-interfaces/operations";

import Test, {satieApplication} from "./test";
import {prefix} from "./config";
const STYLES = require("./tests.css");

import {Application, Song, Patch, Type, IMouseEvent} from "../../src/index";

const MAX_SAFE_INTEGER = 9007199254740991;

interface IState {
    error?: Error;
    operations?: any;
    canonicalOperations?: any;
    oldOperations?: IAny[][];
    note?: Count;
    type?: "N" | "R";
    lastPath?: (number | string)[];
    lastPitch?: Pitch;
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
        error: null,
        canonicalOperations: null,
        operations: null,
        oldOperations: [null],
        note: Count.Eighth,
        type: "N",
        lastPath: null,
        lastPitch: null,
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
    private _song: Song;
    private _undo() {
        this.setState({
            operations: this.state.oldOperations[this.state.oldOperations.length - 1],
            canonicalOperations: this.state.oldOperations[this.state.oldOperations.length - 1],
            oldOperations: this.state.oldOperations.slice(0, this.state.oldOperations.length - 1)
        });
    }
    private _newMeasure() {
        const doc = this._song.getDocument(this.state.canonicalOperations);
        const measureCount = doc.measures.length;

        let oldOperations = this.state.oldOperations.concat([this.state.canonicalOperations]);
        let operations = this._song.createCanonicalPatch(this.state.canonicalOperations,
            {
                documentBuilder: (document) => document
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
                                ], 0)
                            )
                        )
                )
            }
        );
        this.setState({operations, oldOperations, canonicalOperations: operations});
    }
    private _newCursor() {
        const doc = this._song.getDocument(this.state.canonicalOperations);
        const patch = [
            {
                p: [doc.measures[0].uuid, "parts", "P1", "voices", "1", 1],
                li: {
                    "_class": "VisualCursor",
                },
            },
        ];
        let oldOperations = this.state.oldOperations.concat([this.state.operations]);
        let operations = this._song.createCanonicalPatch(
            this.state.canonicalOperations, {raw: patch});
        this.setState({operations, oldOperations, canonicalOperations: operations});
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
                <li style={{padding: 10}}><a href="javascript:void(0)"
                    onClick={this._newCursor.bind(this)}>+</a></li>
            </ul>
            <Song baseSrc={songTemplate}
                onError={this._errorHandler}
                patches={this.state.operations}
                onMouseClick={this._mouseClickHandler}
                onMouseMove={this._mouseMoveHandler}
                pageClassName={STYLES.page}
                singleLineMode={true}
                ref={this._setSongRef} />
            {/*<pre style={{fontSize: 8, height: 400, overflow: "scroll"}}>{
                JSON.stringify(this.state.operations, null, 2)}</pre>*/}
        </div>;
    }
    private _errorHandler = (err: Error) => {
        console.warn(err);
        defer(() => {
            this.setState({
                error: err,
            });
        });
    };
    private _setSongRef = (song: Song) => {
        this._song = song;
        (window as any)["_song"] = song;
    };
    private _mouseMoveHandler = (ev: IMouseEvent) => {
        if (isEqual(this.state.lastPath, ev.path) && isEqual(ev.pitch, this.state.lastPitch)) {
            return;
        }
        if (!this._handler(ev, true)) {
            this.setState({operations: this.state.canonicalOperations});
        }
    };
    private _mouseClickHandler = (ev: IMouseEvent) => {
        this._handler(ev, false);
    };
    private _handler(ev: IMouseEvent, isPreview: boolean): boolean {
        const {path, pitch} = ev;
        const oldOperations = this.state.oldOperations.concat([this.state.canonicalOperations]);
        const operations = this.state.canonicalOperations;
        const doc = this._song.getDocument(operations); // TODO: remove getDocument
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
                if (isPreview) {
                    this.setState({
                        operations: this._song.createPreviewPatch(operations, {raw: patch}),
                        lastPath: path,
                        lastPitch: pitch,
                    });
                } else {
                    let newOperations = this._song.createCanonicalPatch(operations, {raw: patch});
                    this.setState({
                        operations: newOperations,
                        canonicalOperations: newOperations,
                        lastPath: null,
                        lastPitch: null,
                        oldOperations
                    });
                }
                return true;
            }
        }
        return false;
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
