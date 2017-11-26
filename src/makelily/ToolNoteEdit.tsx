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
  Articulations,
  Attributes,
  BarStyleType,
  Count,
  Direction,
  DirectionType,
  Dot,
  Dynamics,
  Fermata,
  Key,
  MxmlAccidental,
  NormalAngledSquare,
  Notations,
  Note,
  Pitch,
  Technical,
  TimeModification,
} from 'musicxml-interfaces';
import {
  IAttributesBuilder,
  IBarlineBuilder,
  IBarStyleBuilder,
  INoteBuilder,
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
  Patch,
  Song,
  StaffBuilder,
  Type,
  VoiceBuilder,
} from './satie/src/satie';

import NoteAdditionalHelp from './NoteAdditionalHelp';
import NotePalette from './NotePalette';
import { PartBuilder } from './satie/src/engine_createPatch';
import tabStyles from './tabStyles';
import { ToolProps } from './tool';

export function toSerializable<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as any;
}

function getOctaveDifference(ours: string, theirs: string): number {
  function mod(a: number, b: number): number {
    return a - b * Math.floor(a / b);
  }

  const pitchNames: string = 'CDEFGAB';
  const ourIndex: number = pitchNames.indexOf(ours.toUpperCase());
  const theirIndex: number = pitchNames.indexOf(theirs.toUpperCase());
  const up: boolean = mod(ourIndex - theirIndex, 7) > 3;
  const octaveChange: boolean = up ? theirIndex < ourIndex : theirIndex > ourIndex;
  if (octaveChange) {
    return up ? 1 : -1;
  }

  return 0;
}

const songTemplate: string = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 3.0 Partwise//EN"
                                "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise>
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
      <system-distance>131</system-distance>
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
        <system-distance>131</system-distance>
        <top-system-distance>40</top-system-distance>
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
  </part>
</score-partwise>`;

interface State {
  accidental: MxmlAccidental;
  canonicalOperations: any;
  direction: Direction;
  dots: number;
  editType: 'N' | 'R' | 'P';
  lastPath: (number | string)[];
  lastPitch: Pitch;
  notation: Notations;
  note: Count;
  operations: any;
  redoStack: IAny[][];
  relativeMode: boolean;
  showAdditionalHelp: 'keyboard' | 'midi' | 'mouse'| 'relative' | 'whyNotEdit' | null;
  showHelp: boolean;
  src: string;
  timeModification: TimeModification;
  undoStack: IAny[][];
}

/**
 * A tool which allows notes to be entered with a mouse or keyboard.
 * This may also eventually support MIDI keyboards.
 */
export default class ToolNoteEdit extends React.Component<ToolProps, State> {
  state: State = {
    accidental: null,
    canonicalOperations: null,
    direction: null,
    dots: 0,
    editType: 'N',
    lastPath: null,
    lastPitch: null,
    notation: null,
    note: Count.Eighth,
    operations: null,
    redoStack: [],
    relativeMode: true,
    showAdditionalHelp: null,
    showHelp: true,
    src: songTemplate,
    timeModification: null,
    undoStack: [null],
  };

  private song: ISong;

  componentDidMount(): void {
    (ReactDOM.findDOMNode(this) as any).focus();
  }

  // tslint:disable-next-line:max-func-body-length
  render(): JSX.Element {
    const { editType } = this.state;
    const tallPalette: boolean = editType === 'P';

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
        <div className={css(tabStyles.help, this.state.showHelp && tabStyles.helpVisible)}>
          {/*tslint:disable:react-a11y-anchors*/}
          <i className="fa-info-circle fa" />{' '}
          Generate markup
          <sup>
            <a
              href="javascript:void(0)"
              onClick={this.handleShowHelpWhyNotEdit}
              role="button"
            >
              ?
            </a>
          </sup>{' '}
          for notes in your song using a{' '}
          <a
            href="javascript:void(0)"
            onClick={this.handleShowHelpMouse}
            role="button"
          >
            mouse
          </a>,{' '}
          <a
            href="javascript:void(0);"
            onClick={this.handleShowHelpKeyboard}
            role="button"
          >
            computer keyboard
          </a>, or{' '}
          <a
            href="javascript:void(0);"
            onClick={this.handleShowHelpMIDI}
            role="button"
          >
            MIDI keyboard
          </a>.
        </div>

        {this.renderAdditionalHelp()}
        {this.renderPalette()}
        <div className={css(tabStyles.section)}>
          <div
            className={css(styles.songContainer, tallPalette && styles.songContainerSmall)}
            onScroll={this.handleSongScroll}
          >
            {song}
          </div>
        </div>
        <div className={css(tabStyles.spacer)} />
        <div className={css(tabStyles.section)}>
          <span className={css(tabStyles.outputOptions)}>
            <input
              type="checkbox"
              checked={this.state.relativeMode}
              onChange={(): void => this.setState({ relativeMode: !this.state.relativeMode })}
              aria-checked={false}
              id="toolnoteedit-relative"
            />
            <label
              htmlFor="toolnoteedit-relative"
            >
              <code>\relative</code> mode
              <sup>
                <a
                  href="javascript:void(0)"
                  onClick={this.handleShowHelpRelative}
                  role="button"
                >
                  ?
                </a>
              </sup>{' '}
            </label>
          </span>
          <pre className={css(tabStyles.lyPreview)}>
            {this.generateLy()}
          </pre>

          <button className={css(tabStyles.insert)} onClick={this.handleInsertLyClicked}>
            Insert this code into Hacklily
          </button>
        </div>
      </div>
    );
    // tslint:enable:react-a11y-anchors
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

  // tslint:disable-next-line:max-func-body-length
  private generateLy(): string {
    if (!this.song) {
      // still loading...
      return '';
    }

    const { relativeMode } = this.state;
    let prevPitch: Pitch | null = null;
    let prevDuration: Count | null = null;

    const doc: Document = this.song.getDocument(this.state.canonicalOperations);
    let ly: string = '';
    // tslint:disable-next-line:max-func-body-length
    doc.measures.forEach((measure: IMeasure) => {
      const part: IMeasurePart = measure.parts.P1;
      const voice: ISegment = part.voices[1];
      const staff: ISegment = part.staves[1];
      let voiceDiv: number = 0;
      let staffDiv: number = 0;
      let staffModelIdx: number = 0;
      // tslint:disable-next-line:cyclomatic-complexity max-func-body-length
      voice.forEach((model: IModel): void => {
        if (doc.modelHasType(model, Type.Chord)) {
          if (model.length < 1) {
            console.warn('Expected chords to have at least one note');

            return;
          }
          const noteForRythm: Note = model[0];

          if (noteForRythm.rest) {
            ly += 'r';
          } else {
            let pitches: string = '';
            if (model.length > 1) {
              pitches += '<';
            }
            // tslint:disable-next-line:prefer-for-of
            for (let i: number = 0; i < model.length; i += 1) {
              const note: Note = model[i];
              pitches += note.pitch.step.toLowerCase();
              if (note.pitch.alter === -1) {
                pitches += 'es';
              } else if (note.pitch.alter === 1) {
                pitches += 'is';
              }
              const octaveOffset: number = relativeMode ?
                (prevPitch ?
                  getOctaveDifference(note.pitch.step, prevPitch.step) +
                    note.pitch.octave - prevPitch.octave :
                  0
                ) :
                note.pitch.octave - 3;
              if (octaveOffset > 0) {
                for (let j: number = 0; j < octaveOffset; j += 1) {
                  pitches += '\'';
                }
              } else if (octaveOffset < 0) {
                for (let j: number = 0; j < -octaveOffset; j += 1) {
                  pitches += ',';
                }
              }
              if (i + 1 < model.length) {
                pitches += ' ';
              }
              prevPitch = note.pitch;
            }
            if (model.length > 1) {
              prevPitch = model[0].pitch;  // the first note in a chord affects future chords
              pitches += '>';
            }

            ly += pitches;
          }

          const duration: Count = noteForRythm.noteType.duration;
          switch (duration) {
            case prevDuration:
              break;
            case Count.Whole:
              ly += '1';
              break;
            case Count.Half:
              ly += '2';
              break;
            case Count.Quarter:
              ly += '4';
              break;
            case Count.Eighth:
              ly += '8';
              break;
            case Count._16th:
              ly += '16';
              break;
            case Count._32nd:
              ly += '32';
              break;
            case Count._64th:
              ly += '64';
              break;
            case Count._128th:
              ly += '128';
              break;
            case Count._256th:
              ly += '256';
              break;
            case Count._512th:
              ly += '512';
              break;
            case Count._1024th:
              ly += '1024';
              break;
            default:
              ly += 'unknown';
              break;
          }

          prevDuration = duration;

          for (const {} of noteForRythm.dots) {
            ly += '.';
          }

          // tslint:disable-next-line:prefer-for-of
          for (let i: number = 0; i < model.length; i += 1) {
            if (model[i].notations) {
              model[i].notations.forEach((notations: Notations): void => {
                if (notations.fermatas) {
                  notations.fermatas.forEach((fermata: Fermata): void => {
                    if (fermata.shape === NormalAngledSquare.Angled) {
                      ly += '\\shortfermata';
                    } else if (fermata.shape === NormalAngledSquare.Square) {
                      ly += '\\longfermata';
                    } else {
                      ly += '\\fermata';
                    }
                  });
                }
                if (notations.articulations) {
                  notations.articulations.forEach((articulations: Articulations): void => {
                    if (articulations.accent) {
                      ly += '->';
                    }
                    if (articulations.tenuto && articulations.staccato) {
                      ly += '-_'; // portato
                    } else {
                      if (articulations.tenuto) {
                        ly += '--';
                      }
                      if (articulations.staccato) {
                        ly += '-.';
                      }
                    }
                    if (articulations.staccatissimo) {
                      ly += '-!';
                    }
                    if (articulations.strongAccent) {
                      ly += '-^';
                    }
                  });
                }
                if (notations.technicals) {
                  notations.technicals.forEach((technicals: Technical): void => {
                    if (technicals.harmonic) {
                      ly += '\\open';
                    }
                    if (technicals.stopped) {
                      ly += '-+';
                    }
                    if (technicals.snapPizzicato) {
                      ly += '\\snappizzicato';
                    }
                    if (technicals.upBow) {
                      ly += '\\upbow';
                    }
                    if (technicals.downBow) {
                      ly += '\\downbow';
                    }
                  });
                }

              });
            }
          }

          ly += ' ';
        }

        voiceDiv += model.divCount;

        function next(): void {
          staffDiv += staff[staffModelIdx].divCount;
          staffModelIdx += 1;
        }

        for (; staffDiv < voiceDiv && staffModelIdx < staff.length; next()) {
          const staffModel: IModel = staff[staffModelIdx];
          if (doc.modelHasType(staffModel, Type.Direction)) {
            staffModel.directionTypes.forEach((directionType: DirectionType): void => {
              if (directionType.dynamics) {
                const d: Dynamics = directionType.dynamics;
                if (d.ppp) {
                  ly += '\\ppp ';
                }
                if (d.pp) {
                  ly += '\\pp ';
                }
                if (d.p) {
                  ly += '\\p ';
                }
                if (d.mp) {
                  ly += '\\mp ';
                }
                if (d.mf) {
                  ly += '\\mf ';
                }
                if (d.f) {
                  ly += '\\f ';
                }
                if (d.ff) {
                  ly += '\\ff ';
                }
                if (d.fff) {
                  ly += '\\fff ';
                }
                if (d.fp) {
                  ly += '\\fp ';
                }
                if (d.sf) {
                  ly += '\\sf ';
                }
                if (d.sfz) {
                  ly += '\\sfz ';
                }
                if (d.sfp) {
                  ly += '\\sfp ';
                }
                if (d.rfz) {
                  ly += '\\rfz ';
                }
              }
            });
          }
        }
      });

      if (measure.idx + 1 !== doc.measures.length) {
        ly += '|\n';
      }
    });

    return ly.trim();
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
    } else if (ev.keyCode === 37) { // left
      this.moveCursor(-1);
    } else if (ev.keyCode === 38) { // up
      this.updateOctave(1);
      ev.preventDefault();
    } else if (ev.keyCode === 39) { // right
      this.moveCursor(2);
    } else if (ev.keyCode === 40) { // down
      this.updateOctave(-1);
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

  // tslint:disable-next-line:max-func-body-length cyclomatic-complexity
  private handleKeyPress = (ev: React.KeyboardEvent<HTMLDivElement>): boolean => {
    const key: string = (ev.key || String.fromCharCode(ev.keyCode)).toUpperCase();
    if ((key === 'R' || key === 'C' || key === 'V') && (ev.metaKey || ev.ctrlKey)) {
      // Support certain default browser operations by not preventing default.
      return true;
    }

    ev.preventDefault();

    if (ev.metaKey || ev.ctrlKey) {
      return false;
    }

    if (this.handleKeyPressSetAccidental(key)) {
      return false;
    }
    if (this.handleKeyPressSetDuration(key)) {
      return false;
    }
    if (this.handleKeyPressSetEditType(key)) {
      return false;
    }
    if (key === '.') {
      this.setDots(((this.state.dots || 0) + 1) % 4);

      return false;
    }

    if ('ABCDEFG'.indexOf(key) !== -1) {
      const doc: Document = this.song.getDocument(this.state.canonicalOperations);
      if (!doc._visualCursor) {
        return false;
      }
      if (ev.shiftKey) {
        this.updateChord(key);

        return false;
      }

      const path: string[] = doc._visualCursor.key.replace('SATIE', '').split('_');
      const measureNum: number = parseInt(path[0], 10);
      const currMeasure: IMeasure = doc.measures.find((i: IMeasure) =>
        i.uuid === parseInt(path[0], 10));

      // Get the previous pitch
      // HACK -- this does not support multiple voices, parts, non-linear measures
      let previousPitch: Pitch;
      for (let i: number = 0; i <= currMeasure.idx; i += 1) {
        const measure: IMeasure = doc.measures[i];
        const voice: ISegment = measure.parts.P1.voices[1];

        for (let j: number = 0; j < voice.length; j += 1) {
          if (i === currMeasure.idx && j === parseInt(path[5], 10)) {
            break;
          }

          const el: IModel = voice[j];
          if (doc.modelHasType(el, Type.Chord)) {
            const note: Note = el[0];
            if (!note.rest) {
              previousPitch = note.pitch;
            }
          }
        }
      }

      const pitch: Pitch = this.getPitch(
        {
          octave: previousPitch ?
            previousPitch.octave + getOctaveDifference(previousPitch.step, key) :
            4,
          step: key,
        },
        doc,
        currMeasure,
      );

      if (path[3] === 'voices') {
        const patch: IAny[] = Patch.createPatch(
          false,
          doc,
          measureNum,
          path[2],
          (partBuilder: PartBuilder) => partBuilder
            .voice(parseInt(path[4], 10), (voice: VoiceBuilder) => voice
              .at(parseInt(path[5], 10))
              .insertChord([(note: INoteBuilder): INoteBuilder => this.state.accidental ?
                note
                  .pitch(pitch)
                  .rest(undefined)
                  .dots(times(this.state.dots, () => ({})))
                  .noteType((noteType: ITypeBuilder) => noteType
                    .duration(this.state.note),
                )
                  .color('#000000') :
                note
                  .pitch(pitch)
                  .rest(undefined)
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

  private handleKeyPressSetAccidental(key: string): boolean {
    if (key === '=') {
      this.setAccidental(MxmlAccidental.Sharp);

      return true;
    }
    if (key === '-') {
      this.setAccidental(MxmlAccidental.Flat);

      return true;
    }
    if (key === '0') {
      this.setAccidental(MxmlAccidental.Natural);

      return true;
    }

    return false;
  }

  private handleKeyPressSetDuration(key: string): boolean {
    if (key === '1') {
      this.setNote(32);

      return true;
    }
    if (key === '2') {
      this.setNote(16);

      return true;
    }
    if (key === '3') {
      this.setNote(8);

      return true;
    }
    if (key === '4') {
      this.setNote(4);

      return true;
    }
    if (key === '5') {
      this.setNote(2);

      return true;
    }
    if (key === '6') {
      this.setNote(1);

      return true;
    }

    return false;
  }

  private handleKeyPressSetEditType(key: string): boolean {
    if (key === 'N') {
      this.setEditType('N');

      return true;
    }
    if (key === 'R') {
      this.setEditType('R');

      return true;
    }
    if (key === 'P') {
      this.setEditType('P');

      return true;
    }

    return false;
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
      return false;
    }
    if (this.state.editType === 'P') {
      return this.handleDirectionEvent(doc, measure, measureUUID, ev, isPreview);
    }

    if (path[3] === 'voices') {
      return this.handleVoiceEvent(doc, measure, measureUUID, ev, isPreview);
    } // this would be where we handled staff events...

    return false;
  }

  private handleShowHelpKeyboard = (): void => {
    this.setState({
      showAdditionalHelp: 'keyboard',
    });
  }

  private handleShowHelpMIDI = (): void => {
    this.setState({
      showAdditionalHelp: 'midi',
    });
  }

  private handleShowHelpMouse = (): void => {
    this.setState({
      showAdditionalHelp: 'mouse',
    });
  }

  private handleShowHelpNone = (): void => {
    this.setState({
      showAdditionalHelp: null,
    });
  }

  private handleShowHelpRelative = (): void => {
    this.setState({
      showAdditionalHelp: 'relative',
    });
  }

  private handleShowHelpWhyNotEdit = (): void => {
    this.setState({
      showAdditionalHelp: 'whyNotEdit',
    });
  }

  private handleSongScroll = (ev: React.UIEvent<HTMLDivElement>): void => {
    const showHelp: boolean = ev.currentTarget.scrollTop === 0;

    if (showHelp !== this.state.showHelp) {
      this.setState({
        showHelp,
      });
    }
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
      this.state.editType === 'R') {
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
                  /* tslint:disable-next-line no-object-literal-type-assertion */
                  .rest({ _force: true } as {})
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
                    .rest(undefined)
                    .dots(times(this.state.dots, () => ({
                      color: isPreview ? '#cecece' : '#000000',
                    })))
                    .noteType((noteType: ITypeBuilder) => noteType
                      .duration(this.state.note),
                    )
                    .color(isPreview ? '#cecece' : '#000000') :
                  note
                    .pitch(pitch)
                    .rest(undefined)
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
                .rest(undefined)
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
    const doc: Document = this.song.getDocument(this.state.canonicalOperations);
    const measureCount: number = doc.measures.length;
    const measureUUID: number = doc.measures[doc.measures.length - 1].uuid;
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

  private renderAdditionalHelp(): JSX.Element {
    if (this.state.showAdditionalHelp === null) {
      return null;
    }

    return (
      <NoteAdditionalHelp
        kind={this.state.showAdditionalHelp}
        onHide={this.handleShowHelpNone}
      />
    );
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
        redo={this.redo}
        setAccidental={this.setAccidental}
        setDirection={this.setDirection}
        setTimeModification={this.setTimeModification}
        setDots={this.setDots}
        setEditType={this.setEditType}
        setNotation={this.setNotation}
        setNote={this.setNote}
        timeModification={this.state.timeModification}
        newMeasure={this.newMeasure}
        undo={this.undo}
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
    if (this.state.accidental === accidental && this.state.editType === 'N') {
      this.setState({
        accidental: null,
        editType: 'N',
      });
    } else {
      this.setState({
        accidental,
        editType: 'N',
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
      editType: this.state.editType === 'R' ? 'R' : 'N',
    });
  }

  private setEditType: (editType: 'N' | 'R' | 'P') => void = (editType): void => {
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
      editType: this.state.editType === 'R' ? 'R' : 'N',
      note,
    });
  }

  private setSongRef = (song: ISong): void => {
    this.song = song;
    if (song) {
      const doc: Document = song.getDocument(this.state.canonicalOperations);
      const patch: IAny[] = Patch.createPatch(
        false,
        doc,
        doc.measures[0].uuid,
        'P1',
        (part: PartBuilder): PartBuilder => part
          .staff(1, (staff: StaffBuilder): StaffBuilder => staff
            .at(1)
            .attributes((attributes: IAttributesBuilder): IAttributesBuilder =>
              attributes
                .clefs([this.props.clef])
                .keySignatures([this.props.keySig])
                .times([this.props.time]),
            ),
          )
          .voice(1, (voice: VoiceBuilder): VoiceBuilder => voice
            .at(0)
            .addVisualCursor(),
          ),
        );
      this.applyUndoablePatch(patch);
    }
  }

  private setTimeModification = (timeModification: TimeModification): void => {
    this.setState({
      editType: this.state.editType === 'R' ? 'R' : 'N',
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

  private updateChord = (newNote: string): boolean => {
    const doc: Document = this.song.getDocument(this.state.canonicalOperations);
    if (!doc._visualCursor) {
      return false;
    }

    const path: string[] = doc._visualCursor.key.replace('SATIE', '').split('_');
    const currMeasure: IMeasure = doc.measures.find((i: IMeasure) =>
      i.uuid === parseInt(path[0], 10));

    if (path[3] !== 'voices') {
      return false;
    }

    // HACK -- this does not support multiple voices, parts, non-linear measures
    let oldPitch: Pitch;
    let oldDots: number;
    let oldMeasureUUID: number;
    let oldIdx: number;
    let oldNumberOfNotes: number;
    let oldDuration: Count;

    for (let i: number = 0; i <= currMeasure.idx; i += 1) {
      const measure: IMeasure = doc.measures[i];
      const voice: ISegment = measure.parts.P1.voices[1];

      for (let j: number = 0; j < voice.length; j += 1) {
        if (i === currMeasure.idx && j === parseInt(path[5], 10)) {
          break;
        }

        const el: IModel = voice[j];
        if (doc.modelHasType(el, Type.Chord)) {
          const note: Note = el[el.length - 1];
          if (!note.rest) {
            oldPitch = note.pitch;
            oldDuration = note.noteType.duration;
            oldDots = note.dots.length;
            oldMeasureUUID = measure.uuid;
            oldIdx = j;
            oldNumberOfNotes = el.length;
          }
        }
      }
    }

    if (oldPitch) {
      const newPitch: Pitch = this.getPitch(
        {
          octave: oldPitch ?
            oldPitch.octave + getOctaveDifference(oldPitch.step, newNote) :
            4,
          step: newNote,
        },
        doc,
        currMeasure,
      );

      const patch: IAny[] = Patch.createPatch(
        false,
        doc,
        oldMeasureUUID,
        path[2],
        (partBuilder: PartBuilder) => partBuilder
          .voice(1, (oldVoice: VoiceBuilder) => oldVoice
            .at(oldIdx)
            .insertNote(oldNumberOfNotes, (noteBuilder: INoteBuilder) => noteBuilder
              .pitch(newPitch)
              .rest(undefined)
              .dots(times(oldDots, () => ({})))
              .noteType((noteType: ITypeBuilder) => noteType
                .duration(oldDuration)),
            ),
          ),
      );
      this.applyUndoablePatch(patch);
      this.playNote(newPitch);

      return true;
    }

    return false;
  }

  private updateOctave = (octave: number): boolean => {
    const doc: Document = this.song.getDocument(this.state.canonicalOperations);
    if (!doc._visualCursor) {
      return false;
    }

    const path: string[] = doc._visualCursor.key.replace('SATIE', '').split('_');
    const currMeasure: IMeasure = doc.measures.find((i: IMeasure) =>
      i.uuid === parseInt(path[0], 10));

    if (path[3] !== 'voices') {
      return false;
    }

    // HACK -- this does not support multiple voices, parts, non-linear measures
    let oldPitch: Pitch;
    let oldMeasureUUID: number;
    let oldIdx: number;
    let oldNoteNumber: number;

    for (let i: number = 0; i <= currMeasure.idx; i += 1) {
      const measure: IMeasure = doc.measures[i];
      const voice: ISegment = measure.parts.P1.voices[1];

      for (let j: number = 0; j < voice.length; j += 1) {
        if (i === currMeasure.idx && j === parseInt(path[5], 10)) {
          break;
        }

        const el: IModel = voice[j];
        if (doc.modelHasType(el, Type.Chord)) {
          oldNoteNumber = el.length - 1;
          const note: Note = el[oldNoteNumber];
          if (!note.rest) {
            oldPitch = note.pitch;
            oldMeasureUUID = measure.uuid;
            oldIdx = j;
          }
        }
      }
    }

    if (oldPitch) {
      const updatedPitch: Pitch = {
        ...oldPitch,
        octave: oldPitch.octave + octave,
      };

      const patch: IAny[] = Patch.createPatch(
        false,
        doc,
        oldMeasureUUID,
        path[2],
        (partBuilder: PartBuilder) => partBuilder
          .voice(1, (oldVoice: VoiceBuilder) => oldVoice
            .at(oldIdx)
            .note(oldNoteNumber, (oldNote: INoteBuilder) =>
              oldNote.pitch(updatedPitch),
            ),
          ),
      );
      this.applyUndoablePatch(patch);
      this.playNote(updatedPitch);

      return true;
    }

    return false;
  }
}

// tslint:disable-next-line typedef
const styles = StyleSheet.create({
  newBar: {
    textAlign: 'center',
  },
  song: {
    width: '100%',
  },
  songContainer: {
    marginLeft: -18,
    marginRight: -18,
    marginTop: -48,
    maxHeight: 388,
    overflowX: 'hidden',
    overflowY: 'scroll',
  },
  songContainerSmall: {
    maxHeight: 308,
  },
});
