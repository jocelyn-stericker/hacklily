/**
 * @license
 * This file is part of Makelily
 * Copyright (C) 2017 - present Joshua Netterfield <joshua@nettek.ca>
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301  USA
 */

import { css, StyleSheet } from 'aphrodite';
import * as invariant from 'invariant';
import {
  find,
  findIndex,
  first,
  forEach,
  isEqual,
  last,
  reduce,
  some,
  times,
} from 'lodash';
import {
  AboveBelow,
  Attributes,
  BarStyleType,
  Clef,
  Count,
  Direction,
  Dot,
  Key,
  MxmlAccidental,
  Notations,
  Note,
  Pitch,
  Print,
  Time,
  TimeModification,
} from 'musicxml-interfaces';
import {
  IAttributesBuilder,
  IBarlineBuilder,
  IBarStyleBuilder,
  IClefBuilder,
  IKeyBuilder,
  INoteBuilder,
  ITimeBuilder,
  ITypeBuilder,
} from 'musicxml-interfaces/builders';
import { IAny } from 'musicxml-interfaces/operations';
import React from 'react';
import ReactDOM from 'react-dom';
import {
  Addons as SatieAddons,
  Document,
  DocumentBuilder,
  IMeasure,
  IMeasurePart,
  IModel,
  IMouseEvent,
  ISegment,
  ISong,
  MeasureBuilder,
  PartBuilder,
  Patch,
  Song,
  StaffBuilder,
  Type,
  VoiceBuilder,
} from './satie/src/satie';

import NotePalette from './NotePalette';
import tabStyles from './tabStyles';
import { ToolProps } from './tool';

export function toSerializable<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as any;
}

const songTemplate: string = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.0 Partwise//EN"
                                "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise>
  <movement-title>Hacklily Note Entry</movement-title>
  <identification>
    <miscellaneous>
      <miscellaneous-field name="description">
        A song created at https://www.hacklily.org
      </miscellaneous-field>
    </miscellaneous>
  </identification>
  <defaults>
    <system-layout>
      <system-margins>
        <left-margin>0</left-margin>
        <right-margin>0</right-margin>
      </system-margins>
      <system-distance>0</system-distance>
      <top-system-distance>0</top-system-distance>
    </system-layout>
  </defaults>
  <part-list>
    <score-part id="P1">
      <part-name>MusicXML Part</part-name>
    </score-part>
  </part-list>
  <!--=========================================================-->
  <part id="P1">
    <measure number="1">
      <print page-number="1">
      <system-layout>
        <system-margins>
          <left-margin>0</left-margin>
          <right-margin>0</right-margin>
        </system-margins>
        <system-distance>0</system-distance>
        <top-system-distance>0</top-system-distance>
      </system-layout>
      </print>
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

export type ContextualPopupType = (
  'new-bar' |
  'edit-clef-button' |
  'clef-editor' |
  'edit-time-button' |
  'time-editor' |
  'edit-key-button' |
  'key-editor'
);

interface ContextualPopup {
  popupType: ContextualPopupType;
  x: number;
  y: number;
}

interface ContextualPopupNewBar extends ContextualPopup {
  afterMeasure: number;
  popupType: 'new-bar';
}

function isNewBar(p: ContextualPopup): p is ContextualPopupNewBar {
  return p && p.popupType === 'new-bar';
}

interface ContextualPopupEditClefButton extends ContextualPopup {
  attributesPath: (number | string)[];
  popupType: 'edit-clef-button';
}

// function isEditClefButton(p: IContextualPopup): p is IContextualPopupEditClefButton {
//   return p && p.type === "edit-clef-button";
// }

// interface IContextualPopupClefEditor extends IContextualPopup {
//   type: "clef-editor";
//   attributesPath: (number | string)[];
// }

// function isClefEditor(p: IContextualPopup): p is IContextualPopupClefEditor {
//   return p && p.type === "clef-editor";
// }

interface ContextualPopupEditKeyButton extends ContextualPopup {
  attributesPath: (number | string)[];
  clef: Clef;
  popupType: 'edit-key-button';
}

// function isEditKeyButton(p: IContextualPopup): p is IContextualPopupEditKeyButton {
//   return p && p.type === "edit-key-button";
// }

// interface IContextualPopupKeyEditor extends IContextualPopup {
//   type: "key-editor";
//   attributesPath: (number | string)[];
//   clef: Clef;
// }

// function isKeyEditor(p: IContextualPopup): p is IContextualPopupKeyEditor {
//   return p && p.type === "key-editor";
// }

interface ContextualPopupEditTimeButton extends ContextualPopup {
  attributesPath: (number | string)[];
  popupType: 'edit-time-button';
}

function isEditTimeButton(p: ContextualPopup): p is ContextualPopupEditTimeButton {
  return p && p.popupType === 'edit-time-button';
}

interface ContextualPopupTimeEditor extends ContextualPopup {
  attributesPath: (number | string)[];
  popupType: 'time-editor';
}

// function isTimeEditor(p: IContextualPopup): p is IContextualPopupTimeEditor {
//   return p && p.type === "time-editor";
// }

interface State {
  accidental?: MxmlAccidental;
  canonicalOperations?: any;
  contextualPopup?: ContextualPopup;
  direction?: Direction;
  dots?: number;
  editType?: 'N' | 'R' | 'P';
  lastPath?: (number | string)[];
  lastPitch?: Pitch;
  notation?: Notations;
  note?: Count;
  operations?: any;
  redoStack?: IAny[][];
  src?: string;
  timeModification?: TimeModification;
  undoStack?: IAny[][];
}

export default class ToolNoteEdit extends React.Component<ToolProps, State> {
  state: State = {
    accidental: null,
    contextualPopup: null,
    direction: null,
    dots: 0,
    editType: 'N',
    lastPath: null,
    lastPitch: null,
    note: Count.Eighth,
    operations: null,
    redoStack: [],
    src: songTemplate,
    timeModification: null,
    undoStack: [null],
  };

  private song: ISong;

  render(): JSX.Element {
    let newBar: JSX.Element | null = null;
    if (isNewBar(this.state.contextualPopup)) {
      const newbarStyle: {} = {
        left: this.state.contextualPopup.x - 10,
        top: this.state.contextualPopup.y,
      };
      newBar = (
        <span
          className={'cx(IndexCSS.tooltip, IndexCSS.tooltipRight, STYLES.newBar)'}
          data-tooltip="New bar"
          style={newbarStyle}
        >
          {/* tslint:disable-next-line react-a11y-anchors */}
          <a href="#" onClick={this.newMeasure} role="button">
            <i className="fa-plus-circle fa" />
          </a>
        </span>
      );
    }

    let editTimeButton: JSX.Element | null = null;
    if (isEditTimeButton(this.state.contextualPopup)) {
      const editTimeButtonStyle: {} = {
        left: this.state.contextualPopup.x - 10,
        top: this.state.contextualPopup.y,
      };
      editTimeButton = (
        <span
          /* className={cx(IndexCSS.tooltip, IndexCSS.tooltipRight, STYLES.newBar)} */
          data-tooltip="Edit time signature"
          style={editTimeButtonStyle}
        >
          {/* tslint:disable-next-line react-a11y-anchors */}
          <a href="#" onClick={this.editTimeSignature} role="button">
            <i className="fa-pencil fa" />
          </a>
        </span>
      );
    }

    let song: JSX.Element | null = null;
    if (this.state.src) {
      song = (
        <Song
          baseSrc={this.state.src}
          onError={this.handleError}
          patches={this.state.operations}
          onMouseClick={this.handleMouseClick}
          onMouseMove={this.handleMouseMove}
          pageClassName={css(styles.song)}
          ref={this.setSongRef}
        />
      );
    }

    return (
      <div
          className={css(tabStyles.tool)}
          tabIndex={0}
          onKeyPress={this.handleKeyPress}
          onKeyDown={this.handleKeyDown}
          role="textbox"
      >
        {this.renderPalette()}
        <div className={css(tabStyles.section)}>
          <div className={css(styles.songContainer)}>
            {newBar}
            {editTimeButton}
            {song}
          </div>
        </div>
        <div className={css(tabStyles.spacer)} />
        <div className={css(tabStyles.section)}>
          <pre className={css(tabStyles.lyPreview)}>
            {this.generateLy()}
          </pre>

          <button className={css(tabStyles.insert)} onClick={this.handleInsertLyClicked}>
            Insert this code into Hacklily
          </button>
        </div>
      </div>
    );
  }

  private applyPreviewPatch = (patch: IAny[],
                               path: (string | number)[] = null, pitch: Pitch = null): void => {
    const operations: any = this.state.canonicalOperations;
    this.setState({
      lastPath: path,
      lastPitch: pitch,
      operations: this.song.createPreviewPatch(operations, { raw: patch }),
    });
  }

  private applyUndoablePatch = (patch: IAny[], doNotEmit: boolean = false): void => {
    const operations: any = this.state.canonicalOperations;
    const newOperations: any = this.song.createCanonicalPatch(operations, { raw: patch });
    const undoStack: IAny[][] = this.state.undoStack.concat([this.state.canonicalOperations]);
    this.setState(
      {
        canonicalOperations: newOperations,
        lastPath: null,
        lastPitch: null,
        operations: newOperations,
        redoStack: [],
        undoStack,
      },
      () => {
        const doc: Document = this.song.getDocument(this.state.operations);
        const loc: {div: number, measure: number} = this.satieKeyToBeat(doc, doc._visualCursor.key);
        if (!loc) {
          return;
        }
      },
    );
  }

  private clearPreview = (): void => {
    this.setState({ operations: this.state.canonicalOperations });
  }

  private editTimeSignature: () => void = (): void => {
    const popup: ContextualPopup = this.state.contextualPopup;
    if (!isEditTimeButton(popup)) {
      return;
    }
    const contextualPopup: ContextualPopupTimeEditor = {
      attributesPath: popup.attributesPath,
      popupType: 'time-editor',
      x: popup.x,
      y: popup.y,
    };

    this.setState({
      contextualPopup,
    });
  }

  private generateLy(): string {
    return 'TODO';
  }

  private getPitch(apitch: Pitch, doc: Document, measure: IMeasure): Pitch {
    const pitch: Pitch = {
      alter: apitch.alter,
      octave: apitch.octave,
      step: apitch.step,
    };
    if (this.state.accidental === MxmlAccidental.Sharp) {
      pitch.alter = 1;
    } else if (this.state.accidental === MxmlAccidental.Flat) {
      pitch.alter = -1;
    } else if (this.state.accidental === MxmlAccidental.Natural) {
      pitch.alter = undefined;
    } else {
      // Make the alter according to the key signature.
      const attributes: Attributes & IModel = doc.search(
        measure.parts.P1.staves[1], 0, Type.Attributes)[0];
      const ks: Key = attributes._snapshot.keySignatures[0];
      const accidentals: {[note: string]: number} = SatieAddons.getAccidentalsFromKey(ks);
      pitch.alter = accidentals[pitch.step];
    }

    return pitch;
  }

  private getValidCursorTargetIndecies(doc: Document, segment: IModel[]): number[] {
    const targetElements: IModel[] = doc.search(segment, 0, Type.Chord);

    return targetElements.map((el: IModel) => segment.indexOf(el));
  }

  // tslint:disable-next-line cyclomatic-complexity
  private handleDirectionEvent(doc: Document, measure: IMeasure, measureUUID: number,
                               ev: IMouseEvent, isPreview: boolean): boolean {
    const path: (string | number)[] = ev.path;
    const part: IMeasurePart = measure.parts[path[2]];
    const elIdx: number = parseInt(path[5] as string, 10);
    const staffSegment: ISegment = part.staves[1];
    const voiceSegment: ISegment = part.voices[1];
    const segment: ISegment = path[3] === 'staves' ? staffSegment : voiceSegment;
    if (!staffSegment) {
      return true;
    }
    const el: IModel = path[3] === 'staves' && staffSegment[elIdx] ||
      path[3] === 'voices' && voiceSegment[elIdx];
    let div: number = 0;

    if (!el || path[3] === 'staves') {
      // XXX: We should also allow placing on top of staff elements
      return false;
    }

    for (let i: number = 0; i < segment.length && segment[i] !== el; i += 1) {
      div += segment[i].divCount;
    }

    if (this.state.direction) {
      const direction: Direction = JSON.parse(JSON.stringify(this.state.direction));
      direction.placement = AboveBelow.Below;
      if (direction.directionTypes && direction.directionTypes[0].dynamics && isPreview) {
        direction.directionTypes[0].dynamics.color = '#aeaeae';
      }

      const patch: IAny[] = Patch.createPatch(isPreview, doc, measureUUID, 'P1',
                                              (partBuilder: PartBuilder) => partBuilder
          .staff(1, (staff: StaffBuilder) => staff
            .atDiv(div, Type.Direction)
            .insertDirection(direction),
        ),
      );

      if (patch) {
        if (isPreview) {
          this.applyPreviewPatch(patch, path);
        } else {
          this.applyUndoablePatch(patch);
        }

        return true;
      }
    } else if (this.state.notation) {
      const notations: Notations = JSON.parse(JSON.stringify(this.state.notation));
      if (el && doc.modelHasType(el, Type.Chord)) {
        const patch: IAny[] = Patch.createPatch(
          isPreview,
          doc,
          measureUUID,
          'P1',
          (partBuilder: PartBuilder) => partBuilder
            .voice(1, (voice: VoiceBuilder) => voice
              .at(elIdx)
              .note(0, (note: INoteBuilder) => {
                if (el[0].notations) {
                  return note.notationsSplice(0, 0, notations);
                } else {
                  return note.notations([notations]);
                }
              }),
          ));
        if (patch) {
          if (isPreview) {
            this.applyPreviewPatch(patch, path);
          } else {
            this.applyUndoablePatch(patch);
          }

          return true;
        }
      }
    } else {
      return true;
    }

    return false;
  }

  private handleError = (err: Error): void => {
    console.warn(err);
  }

  private handleInsertLyClicked = (): void => {
    this.props.onInsertLy(this.generateLy());
  }

  private handleKeyDown = (ev: React.KeyboardEvent<HTMLDivElement>): boolean => {
    if (ev.keyCode === 8) {
      // backspace -- prevent navigation in FF and others
      ev.preventDefault();
    } else if (ev.keyCode === 37) {
      this.moveCursor(-1);
    } else if (ev.keyCode === 38) {
      ev.preventDefault();
    } else if (ev.keyCode === 39) {
      this.moveCursor(2);
    } else if (ev.keyCode === 40) {
      ev.preventDefault();
    } else if (ev.keyCode === 90 /* z */ && (ev.metaKey || ev.ctrlKey)) {
      ev.preventDefault();
      if (ev.shiftKey) {
        this.redo();
      } else {
        this.undo();
      }
    }

    return true;
  }

  private handleKeyPress = (ev: React.KeyboardEvent<HTMLDivElement>): boolean => {
    ev.preventDefault();

    const key: string = (ev.key || String.fromCharCode(ev.keyCode)).toUpperCase();
    if (key === '1') {
      this.setNote(32);

      return false;
    }
    if (key === '2') {
      this.setNote(16);

      return false;
    }
    if (key === '3') {
      this.setNote(8);

      return false;
    }
    if (key === '4') {
      this.setNote(4);

      return false;
    }
    if (key === '5') {
      this.setNote(2);

      return false;
    }
    if (key === '6') {
      this.setNote(1);

      return false;
    }
    if (key === '=') {
      this.setAccidental(MxmlAccidental.Sharp);
    }
    if (key === '-') {
      this.setAccidental(MxmlAccidental.Flat);
    }
    if (key === '0') {
      this.setAccidental(MxmlAccidental.Natural);
    }
    if (key === 'N') {
      this.setEditType('N');
    }
    if (key === 'R') {
      this.setEditType('R');
    }
    if (key === '.') {
      this.setDots(((this.state.dots || 0) + 1) % 4);
    }

    if ('ABCDEFG'.indexOf(key) !== -1) {
      const doc: Document = this.song.getDocument(this.state.canonicalOperations);
      if (!doc._visualCursor) {
        return false;
      }

      const path: string[] = doc._visualCursor.key.replace('SATIE', '').split('_');
      const currMeasure: IMeasure = doc.measures.find((i: IMeasure) =>
        i.uuid === parseInt(path[0], 10));
      const pitch: Pitch = this.getPitch({ step: key, octave: 4 }, doc, currMeasure);
      if (path[3] === 'voices') {
        const patch: IAny[] = Patch.createPatch(
          false,
          doc,
          parseInt(path[0], 10),
          path[2],
          (partBuilder: PartBuilder) => partBuilder
            .voice(parseInt(path[4], 10), (voice: VoiceBuilder) => voice
              .at(parseInt(path[5], 10))
              .insertChord([(note: INoteBuilder): INoteBuilder => this.state.accidental ?
                note
                  .pitch(pitch)
                  .rest(null)
                  .dots(times(this.state.dots, () => ({})))
                  .noteType((noteType: ITypeBuilder) => noteType
                    .duration(this.state.note),
                )
                  .color('#000000') :
                note
                  .pitch(pitch)
                  .rest(null)
                  .dots(times(this.state.dots, () => ({})))
                  .noteType((noteType: ITypeBuilder) => noteType
                    .duration(this.state.note),
                )
                  .color('#000000'),
              ])
              .next()
              .addVisualCursor(),
          ),
        );
        this.applyUndoablePatch(patch);
        this.playNote(pitch);
      }
    }

    return true;
  }

  private handleMouseClick = (ev: IMouseEvent): void => {
    this.handler(ev, false);
  }

  private handleMouseMove = (ev: IMouseEvent): void => {
    if (isEqual(this.state.lastPath, ev.path) && isEqual(ev.pitch, this.state.lastPitch)) {
      return;
    }
    if (!this.handler(ev, true)) {
      this.clearPreview();
    }
  }

  /**
   * Changes operations if needed.
   * Returns whether canoncialOperations were changed.
   */
  private handler(ev: IMouseEvent, isPreview: boolean): boolean {
    const { path } = ev;
    const doc: Document = this.song.getDocument(this.state.canonicalOperations);
    const measure: IMeasure = find(
      doc.measures,
      (fmeasure: IMeasure) => String(fmeasure.uuid) === path[0]);

    const measureUUID: number = parseInt(path[0] as string, 10);
    if (!measure || path[1] !== 'parts' || !measure.parts[path[2]]) {
      this.setState({
        contextualPopup: null,
      });

      return false;
    }
    if (this.state.editType === 'P') {
      return this.handleDirectionEvent(doc, measure, measureUUID, ev, isPreview);
    }

    if (path[3] === 'staves') {
      return this.handleStaffEvent(doc, measure, measureUUID, ev, isPreview);
    } else if (path[3] === 'voices') {
      return this.handleVoiceEvent(doc, measure, measureUUID, ev, isPreview);
    }
    this.setState({
      contextualPopup: null,
    });

    return false;
  }

  // tslint:disable-next-line max-func-body-length
  private handleStaffEvent(doc: Document, measure: IMeasure, measureUUID: number,
                           ev: IMouseEvent, isPreview: boolean): boolean {
    const path: (string | number)[] = ev.path;
    const part: IMeasurePart = measure.parts[path[2]];
    const elIdx: number = parseInt(path[5] as string, 10);
    const staffSegment: ISegment = part.staves[parseInt(path[4] as string, 10)];
    const operations: any = this.state.canonicalOperations;
    if (!staffSegment) {
      return true;
    }
    const el: IModel = staffSegment[elIdx];
    if (!el) {
      return true;
    }

    const print: Print = doc.getPrint(0);
    const { pageWidth, pageHeight } = print.pageLayout;
    const songDOM: Element = ReactDOM.findDOMNode(this.song);
    const pageDOM: Element = songDOM.children[0];
    const x: number = ev.pos.x * (pageDOM.clientWidth / pageWidth) +
      (songDOM.clientWidth - pageDOM.clientWidth) / 2;
    const y: number = (ev.matchedOriginY) * (pageDOM.clientHeight / pageHeight) + 30;
    if (doc.modelHasType(el, Type.Barline)) {
      const patch: IAny[] = Patch.createPatch(
        true,
        doc,
        measureUUID,
        'P1',
        (partBuilder: PartBuilder) => partBuilder
          .staff(
            1,
            (staff: StaffBuilder) => staff
              .barline((barline: IBarlineBuilder) => barline
                .barStyle((barStyle: IBarStyleBuilder) => barStyle
                  .color('#aeaeae'),
              ),
            ),
            elIdx,
          ),
      );
      const contextualPopup: ContextualPopupNewBar = {
        afterMeasure: parseInt(String(path[0]), 10),
        popupType: 'new-bar',
        x,
        y,
      };

      this.setState({
        contextualPopup,
        operations: this.song.createPreviewPatch(operations, { raw: patch }),
      });

      return true;
    }
    if (doc.modelHasType(el, Type.Attributes)) {
      const xOrigin: number = ev._private.props.originX;
      const pClef: Clef = ev._private.props.layout.clef;
      const pKS: Key = ev._private.props.layout.keySignature;
      const pTime: Time = ev._private.props.layout.time;
      const xTime: number = pTime ? pTime.defaultX : NaN;
      const xKS: number = pKS ? pKS.defaultX : xTime;
      if (pClef && ev.pos.x < xKS + xOrigin) {
        const patch: IAny[] = Patch.createPatch(
          true,
          doc,
          measureUUID,
          'P1',
          (partBuilder: PartBuilder) => partBuilder
            .staff(
              1,
              (staff: StaffBuilder) => staff
                .attributes((attributes: IAttributesBuilder) => attributes
                  .clefsAt(1, (clef: IClefBuilder) => clef
                    .color('#aeaeae'),
                ),
              ),
              elIdx,
          ),
        );
        const contextualPopup: ContextualPopupEditClefButton = {
          attributesPath: [measureUUID, 'parts', 'P1', 'staves', 1, elIdx],
          popupType: 'edit-clef-button',
          x,
          y,
        };
        this.setState({
          contextualPopup,
          operations: this.song.createPreviewPatch(operations, { raw: patch }),
        });

        return true;
      } else if (pKS && ev.pos.x < xTime + xOrigin) {
        const patch: IAny[] = Patch.createPatch(
          true,
          doc,
          measureUUID,
          'P1',
          (partBuilder: PartBuilder) => partBuilder
            .staff(
              1,
              (staff: StaffBuilder) => staff
                .attributes((attributes: IAttributesBuilder) => attributes
                  .keySignaturesAt(0, (ks: IKeyBuilder) => ks
                    .color('#aeaeae'),
                ),
              ),
              elIdx,
          ),
        );
        const contextualPopup: ContextualPopupEditKeyButton = {
          attributesPath: [measureUUID, 'parts', 'P1', 'staves', 1, elIdx],
          clef: (el as Attributes).clefs[1],
          popupType: 'edit-key-button',
          x,
          y,
        };
        this.setState({
          contextualPopup,
          operations: this.song.createPreviewPatch(operations, { raw: patch }),
        });

        return true;
      } else if (pTime) {
        const patch: IAny[] = Patch.createPatch(
          true,
          doc,
          measureUUID,
          'P1',
          (partBuilder: PartBuilder) => partBuilder
            .staff(
              1,
              (staff: StaffBuilder) => staff
                .attributes((attributes: IAttributesBuilder) => attributes
                  .timesAt(0, (time: ITimeBuilder) => time
                    .color('#aeaeae'),
                ),
              ),
              elIdx,
          ),
        );
        const contextualPopup: ContextualPopupEditTimeButton = {
          attributesPath: [measureUUID, 'parts', 'P1', 'staves', 1, elIdx],
          popupType: 'edit-time-button',
          x,
          y,
        };
        this.setState({
          contextualPopup,
          operations: this.song.createPreviewPatch(operations, { raw: patch }),
        });

        return true;
      }
      this.setState({
        contextualPopup: null,
      });

      return false;
    }

    return false;
  }

  // tslint:disable-next-line cyclomatic-complexity max-func-body-length
  private handleVoiceEvent(doc: Document, measure: IMeasure, measureUUID: number,
                           ev: IMouseEvent, isPreview: boolean): boolean {
    const { path } = ev;
    const part: IMeasurePart = measure.parts[path[2]];
    const elIdx: number = parseInt(path[5] as string, 10);
    if (!ev.pitch) {
      return false;
    }
    const pitch: Pitch = this.getPitch(ev.pitch, doc, measure);

    this.setState({
      contextualPopup: null,
    });

    const voiceSegment: ISegment = part.voices[parseInt(path[4] as string, 10)];
    if (!voiceSegment) {
      return true;
    }
    const el: IModel = voiceSegment[elIdx];
    if (!el) {
      return true;
    }
    const isChord: boolean = doc.modelHasType(el, Type.Chord);
    if (!isChord) {
      return false;
    }
    const chord: Note[] = el as any as Note[];
    let patch: IAny[];
    const isCurrentNote: boolean = chord && some(chord, (c: Note) =>
      c.pitch &&
      c.pitch.octave === pitch.octave &&
      c.pitch.step === pitch.step);

    if (this.state.editType === 'N' && chord.length === 1 && chord[0].rest ||
      this.state.editType === 'R' && chord.length === 1 && !chord[0].rest) {
      patch = Patch.createPatch(
        isPreview,
        doc,
        measureUUID,
        'P1',
        (partBuilderOrig: PartBuilder) => {
          let partBuilder: PartBuilder = partBuilderOrig.voice(
            1,
            (voice: VoiceBuilder) => voice
              .note(
              0,
              (note: INoteBuilder) => this.state.editType === 'R' ?
                note
                  .pitch(null)
                  .rest({})
                  .dots(times(this.state.dots, () => ({
                    color: isPreview ? '#cecece' : '#000000',
                  })))
                  .noteType((noteType: ITypeBuilder) => noteType
                    .duration(this.state.note),
                )
                  .color(isPreview ? '#cecece' : '#000000') :
                this.state.accidental ?
                  note
                    .pitch(pitch)
                    .rest(null)
                    .dots(times(this.state.dots, () => ({
                      color: isPreview ? '#cecece' : '#000000',
                    })))
                    .noteType((noteType: ITypeBuilder) => noteType
                      .duration(this.state.note),
                    )
                    .color(isPreview ? '#cecece' : '#000000') :
                  note
                    .pitch(pitch)
                    .rest(null)
                    .dots(times(this.state.dots, () => ({
                      color: isPreview ? '#cecece' : '#000000',
                    })))
                    .noteType((noteType: ITypeBuilder) => noteType
                      .duration(this.state.note),
                    )
                    .color(isPreview ? '#cecece' : '#000000')),

            elIdx,
          );
          if (!isPreview) {
            partBuilder = partBuilder
              .voice(1, (voice: VoiceBuilder) => voice
                .at(elIdx + 1)
                .addVisualCursor(),
            );
          }

          return partBuilder;
        });

      if (!isPreview) {
        // Play the note
        if (this.state.editType === 'N') {
          this.playNote(pitch);
        }
      }
    } else if (this.state.editType === 'N' && chord.length && !chord[0].rest &&
      chord[0].noteType.duration !== this.state.note &&
      isCurrentNote) {
      patch = Patch.createPatch(
        isPreview,
        doc,
        measureUUID,
        'P1',
        (partBuilder: PartBuilder) => partBuilder
          .voice(
            1,
            (voiceInitial: VoiceBuilder) => reduce(
              times(chord.length),
              (voice: VoiceBuilder, noteIdx: number) => voice
                .note(noteIdx, (note: INoteBuilder) => note
                  .dots(chord[0].dots.map((dot: Dot) => {
                    const newDot: Dot = toSerializable(dot);
                    newDot.color = isPreview ? '#cecece' : '#000000';

                    return newDot;
                  }))
                  .noteType((noteType: ITypeBuilder) => noteType
                    .duration(this.state.note),
                  )
                  .color(isPreview ? '#cecece' : '#000000'),
              ),
              voiceInitial,
            ),
            elIdx,
        ),
      );
    } else if (this.state.editType === 'N' && chord.length && !chord[0].rest &&
      !isCurrentNote) {
      patch = Patch.createPatch(
        isPreview,
        doc,
        measureUUID,
        'P1',
        (partBuilder: PartBuilder) => partBuilder
          .voice(
            1,
            (voice: VoiceBuilder) => voice
              .insertNote(chord.length, (note: INoteBuilder) => note
                .pitch(pitch)
                .rest(null)
                .dots(chord[0].dots.map((dot: Dot) => {
                  const newDot: Dot = toSerializable(dot);
                  newDot.color = isPreview ? '#cecece' : '#000000';

                  return newDot;
                }))
                .noteType((noteType: ITypeBuilder) => noteType
                  .duration(chord[0].noteType.duration),
                )
                .color(isPreview ? '#cecece' : '#000000'),
            ),
            elIdx,
        ),
      );

      if (!isPreview) {
        this.playNote(pitch);
        forEach(chord, (note: Note) => this.playNote(note.pitch));
      }
    }
    if (patch) {
      if (isPreview) {
        this.applyPreviewPatch(patch, path, pitch);
      } else {
        this.applyUndoablePatch(patch);
      }

      return true;
    }

    return false;
  }

  private moveCursor = (direction: number): boolean => {
    const doc: Document = this.song.getDocument(this.state.canonicalOperations);
    if (!doc._visualCursor) {
      return true;
    }
    const path: string[] = doc._visualCursor.key.replace('SATIE', '').split('_');
    const measureUUID: number = parseInt(path[0], 10);
    const part: string = path[2];
    if (path[3] !== 'voices') {
      return true;
    }
    const voiceNum: number = parseInt(path[4], 10);
    const elIdx: number = parseInt(path[5], 10);
    const currMeasure: IMeasure = doc.measures
      .find((i: IMeasure) => i.uuid === measureUUID);

    const currSegment: ISegment = currMeasure
      .parts[part]
      .voices[voiceNum];

    const targetIndecies: number[] = this.getValidCursorTargetIndecies(doc, currSegment);

    const nextIdx: number = targetIndecies.reduce(
      (memo: number, idx: number) => {
        if (direction < 0 && idx < elIdx) {
          return idx;
        } else if (direction > 0 && idx > elIdx && memo === null) {
          return idx + 1;
        }

        return memo;
      },
      null);
    if (nextIdx === null) {
      if (direction > 0) {
        this.moveCursorToStartOfMeasure(
          part,
          voiceNum,
          doc.measures[currMeasure.idx + 1],
        );
      } else if (direction < 0) {
        this.moveCursorToEndOfMeasure(
          part,
          voiceNum,
          doc.measures[currMeasure.idx - 1],
        );
      } else {
        invariant(false, 'Invalid direction');
      }
    } else {
      const patch: IAny[] = Patch.createPatch(
        false,
        doc,
        measureUUID,
        part,
        (partBuilder: PartBuilder) => partBuilder
          .voice(voiceNum, (voice: VoiceBuilder) => voice
            .at(nextIdx)
            .addVisualCursor(),
        ),
      );
      this.applyUndoablePatch(patch);
    }

    return false;
  }

  private moveCursorToEndOfMeasure(part: string, voiceNum: number, measure: IMeasure): void {
    this.moveInMeasure(part, voiceNum, measure, (indecies: number[]) =>
      last(indecies) + 1);
  }

  private moveCursorToStartOfMeasure(part: string, voiceNum: number, measure: IMeasure): void {
    this.moveInMeasure(part, voiceNum, measure, first);
  }

  private moveInMeasure(
    part: string,
    voiceNum: number,
    measure: IMeasure,
    pickIdx: (n: number[]) => number,
  ): void {
    if (!measure) {
      return;
    }
    const doc: Document = this.song.getDocument(this.state.canonicalOperations);
    const targetIndecies: number[] = this.getValidCursorTargetIndecies(
      doc,
      measure.parts[part].voices[voiceNum]);
    const nextIdx: number = pickIdx(targetIndecies);
    const patch: IAny[] = Patch.createPatch(
      false,
      doc,
      measure.uuid,
      part,
      (partBuilder: PartBuilder) => partBuilder
        .voice(voiceNum, (voice: VoiceBuilder) => voice
          .at(nextIdx)
          .addVisualCursor(),
      ),
    );
    this.applyUndoablePatch(patch);
  }

  private newMeasure: () => void = (): void => {
    const popup: ContextualPopup = this.state.contextualPopup;
    if (!isNewBar(popup)) {
      return;
    }
    const doc: Document = this.song.getDocument(this.state.canonicalOperations);
    const measureCount: number = doc.measures.length;
    const measureUUID: number = popup.afterMeasure;
    const measureIdx: number = doc.measures.findIndex(
      (m: IMeasure) => m.uuid === measureUUID);

    const undoStack: IAny[][] = this.state.undoStack.concat([this.state.canonicalOperations]);

    const barlineIdx: number = findIndex(
      doc.measures[measureIdx].parts.P1.staves[1],
      (el: IModel) => doc.modelHasType(el, Type.Barline));

    const operations: any = this.song.createCanonicalPatch(
      this.state.canonicalOperations,
      {
        documentBuilder: (document: DocumentBuilder): DocumentBuilder => document
          .measure(measureUUID, (measure: MeasureBuilder) => measure
            .part('P1', (part: PartBuilder) => part
              .staff(1, (staff: StaffBuilder) => staff
                .at(barlineIdx)
                .barline((barline: IBarlineBuilder) => barline
                  .barStyle((style: IBarStyleBuilder) => style
                    .data(BarStyleType.Regular),
                ),
              ),
            ),
          ),
        )
          .insertMeasure(measureIdx + 1, (measure: MeasureBuilder) => measure
            .part('P1', (part: PartBuilder) => part
              .voice(1, (voice: VoiceBuilder) => voice
                .at(0)
                .insertChord([
                  (note: INoteBuilder): INoteBuilder => note
                    .rest({})
                    .staff(1)
                    .noteType((noteType: ITypeBuilder) => noteType
                      .duration(Count.Whole),
                  ),
                ]),
            )
              .staff(1, (staff: StaffBuilder) => staff
                .at(1)
                .insertBarline((barline: IBarlineBuilder) => barline
                  .barStyle((style: IBarStyleBuilder) => style
                    .data(measureCount === measureIdx + 1 ?
                      BarStyleType.LightHeavy :
                      BarStyleType.Regular),
                ),
              ),
            ),
          ),
        ),
      },
    );
    this.setState({
      canonicalOperations: operations,
      operations,
      redoStack: [],
      undoStack,
    });
  }

  private playNote(pitch: Pitch): void {
    // tslint:disable-next-line no-console
    console.log('TODO: play', pitch);
  }

  private redo: () => void = (): void => {
    this.setState({
      canonicalOperations: this.state.redoStack[this.state.redoStack.length - 1],
      operations: this.state.redoStack[this.state.redoStack.length - 1],
      redoStack: this.state.redoStack.slice(0, this.state.redoStack.length - 1),
      undoStack: this.state.undoStack.concat(this.state.operations),
    });
  }

  private renderPalette(): JSX.Element {
    return (
      <NotePalette
        accidental={this.state.accidental}
        direction={this.state.direction}
        dots={this.state.dots}
        editType={this.state.editType}
        notation={this.state.notation}
        note={this.state.note}
        setAccidental={this.setAccidental}
        setDirection={this.setDirection}
        setTimeModification={this.setTimeModification}
        setDots={this.setDots}
        setEditType={this.setEditType}
        setNotation={this.setNotation}
        setNote={this.setNote}
        timeModification={this.state.timeModification}
      />
    );
  }

  private satieKeyToBeat(doc: Document, key: string): { div: number, measure: number } {
    const path: string[] = key.replace('SATIE', '').split('_');

    const measureUUID: number = parseInt(path[0], 10);
    const part: string = path[2];
    if (path[3] !== 'voices') {
      return null;
    }
    const voiceNum: number = parseInt(path[4], 10);
    const elIdx: number = parseInt(path[5], 10);
    const measure: IMeasure = doc.measures
      .find((i: IMeasure) => i.uuid === measureUUID);

    const currSegment: ISegment = measure
      .parts[part]
      .voices[voiceNum];
    let div: number = 0;
    for (let i: number = 0; i < elIdx && i < currSegment.length; i += 1) {
      div += currSegment[i].divCount;
    }

    return {
      div,
      measure: measure.idx,
    };
  }

  private setAccidental: (accidental: MxmlAccidental) => void = (accidental): void => {
    if (this.state.accidental === accidental) {
      this.setState({
        accidental: null,
      });
    } else {
      this.setState({
        accidental,
      });
    }
  }

  private setDirection: (direction: Direction) => void = (direction) => {
    this.setState({
      direction,
      notation: null,
    });
  }

  private setDots = (dots: number): void => {
    this.setState({
      dots,
    });
  }

  private setEditType: (editType: 'N' | 'R') => void = (editType): void => {
    this.setState({
      editType,
    });
  }

  private setNotation: (notations: Notations) => void = (notation) => {
    this.setState({
      direction: null,
      notation,
    });
  }

  private setNote: (note: number) => void = (note): void => {
    this.setState({
      note,
    });
  }

  private setSongRef = (song: ISong): void => {
    this.song = song;
  }

  private setTimeModification = (timeModification: TimeModification): void => {
    this.setState({
      timeModification,
    });
  }

  private undo: () => void = (): void => {
    this.setState({
      canonicalOperations: this.state.undoStack[this.state.undoStack.length - 1],
      operations: this.state.undoStack[this.state.undoStack.length - 1],
      redoStack: this.state.redoStack.concat(this.state.operations),
      undoStack: this.state.undoStack.slice(0, this.state.undoStack.length - 1),
    });
  }
}

  // private _handleClosePopup: () => void = () => {
  //   this.setState({
  //     contextualPopup: null,
  //   });
  // }
  // private updatePlaybackForDiv(bar: number, div: number): void {
  //   const doc = this.song.getDocument(this.state.operations);
  //   const divsPerQ = this.totalDivs / this.beats;
  //   const qPerBeat = this.qPerBeat;
  //   const beat = div / divsPerQ / qPerBeat + 1;
  //   if (bar >= doc.measures.length || bar < 0) {
  //     return;
  //   }
  //   let cursorLoc = this.satieKeyToBeat(doc, doc._visualCursor.key);
  //   let maxTries = 100;
  //   while (cursorLoc.measure < bar || cursorLoc.measure === bar && cursorLoc.div < div) {
  //     this.moveCursor(1);
  //     cursorLoc = this.satieKeyToBeat(doc, doc._visualCursor.key);
  //     if (--maxTries <= 0) {
  //       break;
  //     }
  //   }
  //   while (cursorLoc.measure > bar || cursorLoc.measure === bar && cursorLoc.div > div) {
  //     this.moveCursor(-1);
  //     cursorLoc = this.satieKeyToBeat(doc, doc._visualCursor.key);
  //     if (--maxTries <= 0) {
  //       break;
  //     }
  //   }
  //   this.setState({
  //     playbackBeat: beat,
  //     playbackDiv: div,
  //     playbackMeasure: bar + 1,
  //   });
  // }

// private _editKey: () => void = () => {
//   const popup = this.state.contextualPopup;
//   if (!isEditKeyButton(popup)) {
//     return;
//   }
//   this.setState({
//     contextualPopup: {
//       x: popup.x,
//       y: popup.y,
//       type: "key-editor",
//       attributesPath: popup.attributesPath,
//       clef: popup.clef,
//     } as IContextualPopupKeyEditor,
//   });
// }
// private _editClef: () => void = () => {
//   const popup = this.state.contextualPopup;
//   if (!isEditClefButton(popup)) {
//     return;
//   }
//   this.setState({
//     contextualPopup: {
//       x: popup.x,
//       y: popup.y,
//       type: "clef-editor",
//       attributesPath: popup.attributesPath,
//     } as IContextualPopupClefEditor,
//   });
// }
// private _handleTogglePlay: () => Promise<void> = async () => {
  // console.log("Toggle play");
  // const playbackPlaying = !this.state.playbackPlaying;
  // if (playbackPlaying) {
  //     const doc = this._song.getDocument(this.state.operations);
  //     this._updateMemos();
  //     await this._midiPlayback.sendCommand("load",
  //         {json: sheetToMIDI(doc, this.state.playbackBPM)});
  //     await this._midiPlayback.sendCommand("goto", {ms:
  //         ((this.state.playbackMeasure - 1) * this._beats + (this.state.playbackBeat - 1)) *
  //             60 / this.state.playbackBPM * 1000});
  //     await this._midiPlayback.sendCommand("play", {});
  //     this._tickInterval = setInterval(this._onPlaybackTick, 60 /
  //         this.state.playbackBPM / 2 * 1000);
  // } else {
  //     await this._midiPlayback.sendCommand("stop", {});
  //     clearTimeout(this._tickInterval);
  // }
  // return new Promise<void>((resolve) => {
  //     this.setState({
  //         playbackPlaying,
  //     }, resolve);
  // });
// }

// private _onPlaybackTick = async () => {
//   if (!this.state.playbackPlaying) {
//     return;
//   }

//   const doc = this._song.getDocument(this.state.operations);
//   const nextDiv = this.state.playbackDiv + this._totalDivs / this._beats / 2;
//   const newBar = this.state.playbackMeasure - 1 + Math.floor(nextDiv / this._totalDivs);
//   const newDiv = nextDiv % this._totalDivs;
//   if (newBar >= doc.measures.length) {
//     await this._handleTogglePlay();
//     this._updatePlaybackForDiv(0, 0);
//   } else {
//     this._updatePlaybackForDiv(newBar, newDiv);
//   }
// }

// private _getNotePitch(pitch: Pitch) {
//     const noteIdx = "CCDDEFFGGAAB".indexOf(pitch.step.toUpperCase());
//     invariant(noteIdx !== -1, "Invalid note %s", noteIdx);
//     const note = pitch.octave * 12 + noteIdx + (pitch.alter || 0);
//     return note;
// }

/* <Palette
          accidental={this.state.accidental}
          direction={this.state.direction}
          dots={this.state.dots}
          notation={this.state.notation}
          note={this.state.note}
          setAccidental={this._setAccidental}
          setDirection={this._setDirection}
          setDots={this._setDots}
          setNotation={this._setNotation}
          setNote={this._setNote}
          setTimeModification={this._setTimeModification}
          setType={this._setType}
          timeModification={this.state.timeModification}
          type={this.state.type}
     }*/
/* {isClefEditor(this.state.contextualPopup) && <ClefEditor
            x={this.state.contextualPopup.x}
            y={this.state.contextualPopup.y}
            onClose={this._handleClosePopup}
            attributesPath={this.state.contextualPopup.attributesPath}
            getDoc={() => this._song.getDocument(this.state.canonicalOperations)}
            applyUndoablePatch={this._applyUndoablePatch}
            applyPreviewPatch={this._applyPreviewPatch}
            clearPreview={this._clearPreview} />}
          {isEditClefButton(this.state.contextualPopup) && <span
            className={cx(IndexCSS.tooltip, IndexCSS.tooltipRight, STYLES.newBar)}
            data-tooltip="Edit clef"
            style={{
              left: this.state.contextualPopup.x - 10,
              top: this.state.contextualPopup.y,
            }}>
            <a href="#" onClick={this._editClef}>
              <i className="fa-pencil fa" />
            </a>
          <}*/
/* {isKeyEditor(this.state.contextualPopup) && <KeyEditor
            clef={this.state.contextualPopup.clef}
            x={this.state.contextualPopup.x}
            y={this.state.contextualPopup.y}
            onClose={this._handleClosePopup}
            attributesPath={this.state.contextualPopup.attributesPath}
            getDoc={() => this._song.getDocument(this.state.canonicalOperations)}
            applyUndoablePatch={this._applyUndoablePatch}
            applyPreviewPatch={this._applyPreviewPatch}
            clearPreview={this._clearPreview} />}
          {isEditKeyButton(this.state.contextualPopup) && <span
            className={cx(IndexCSS.tooltip, IndexCSS.tooltipRight, STYLES.newBar)}
            data-tooltip="Edit key"
            style={{
              left: this.state.contextualPopup.x - 10,
              top: this.state.contextualPopup.y,
            }}>
            <a href="#" onClick={this._editKey}>
              <i className="fa-pencil fa" />
            </a>
          </span>}
          {isTimeEditor(this.state.contextualPopup) && <TimeEditor
            x={this.state.contextualPopup.x}
            y={this.state.contextualPopup.y}
            onClose={this._handleClosePopup}
            attributesPath={this.state.contextualPopup.attributesPath}
            getDoc={() => this._song.getDocument(this.state.canonicalOperations)}
            applyUndoablePatch={this._applyUndoablePatch}
            applyPreviewPatch={this._applyPreviewPatch}
            clearPreview={this._clearPre}*/

  // private updateMemos = (): void => {
  //   const doc = this.song.getDocument(this.state.operations);
  //   let divs = 1000;
  //   const measure = doc.measures[this.state.playbackMeasure - 1];
  //   if (!measure) {
  //     this.playbackIntervalId = null;
  //     this.setState({
  //       playbackPlaying: false,
  //     });
  //     return;
  //   }
  //   const parts = measure.parts;
  //   Object.keys(parts).forEach(partName => {
  //     parts[partName].staves.forEach(staff => {
  //       if (!staff) {
  //         return;
  //       }
  //       for (let i = 0; i < staff.length; ++i) {
  //         const model = staff[i];
  //         if (doc.modelHasType(model, Type.Attributes)) {
  //           this.beats = parseInt(model._snapshot.times[0].beats[0], 10);
  //           divs = model.divisions;
  //           // XXX: not valid for complex cases
  //           this.qPerBeat = 4 / model._snapshot.times[0].beatTypes[0];
  //           this.totalDivs = model.divisions *
  //             parseInt(model._snapshot.times[0].beats[0], 10) * this.qPerBeat;
  //         }
  //       }
  //     });
  //   });
  // }

// tslint:disable-next-line typedef
const styles = StyleSheet.create({
  song: {
    width: '100%',
  },
  songContainer: {
    maxHeight: 320,
    overflowX: 'scroll',
    overflowY: 'scroll',
  },
});
