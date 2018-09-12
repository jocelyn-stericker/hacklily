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

import { css, StyleSheet } from "aphrodite";
import React = require("react");

export interface Props {
  kind: "keyboard" | "midi" | "mouse" | "relative" | "whyNotEdit";
  onHide(): void;
}

/**
 * Renders help links in the note tool.
 */
export default class NoteAdditionalHelp extends React.Component<Props> {
  render(): JSX.Element {
    const { kind, onHide } = this.props;

    return (
      <span className={css(styles.overlay)} onClick={onHide} role="button">
        <span className={css(styles.widget)}>
          {kind === "keyboard" && this.renderKeyboard()}
          {kind === "midi" && this.renderMIDI()}
          {kind === "mouse" && this.renderMouse()}
          {kind === "relative" && this.renderRelative()}
          {kind === "whyNotEdit" && this.renderWhyNotEdit()}

          <p>
            <a href="javascript:void(0)" role="button" onClick={onHide}>
              Close
            </a>
          </p>
        </span>
      </span>
    );
  }

  // tslint:disable-next-line:max-func-body-length
  private renderKeyboard(): JSX.Element {
    return (
      <span>
        <h3>What keyboard shortcuts are available?</h3>
        <table style={{ borderWidth: 1, borderColor: "black" }}>
          <tr>
            <td>1-7</td>
            <td>
              Select note duration (1 = 32
              <sup>nd</sup> note, 7 = whole note) for the next note you enter.
            </td>
          </tr>
          <tr>
            <td>.</td>
            <td>
              Toggle the number of dots to add to the next note you enter.
            </td>
          </tr>
          <tr>
            <td>0, -, =</td>
            <td>
              Sets or unsets the type of accidental for the next note you enter.
            </td>
          </tr>
          <tr>
            <td>a-g</td>
            <td>
              Insert a note where the cursor is. Creates a new bar if cursor is
              at the end of a bar.
            </td>
          </tr>
          <tr>
            <td>r</td>
            <td>
              Insert a rest where the cursor is. Creates a new bar if cursor is
              at the end of a bar.
            </td>
          </tr>
          <tr>
            <td>shift + a-g</td>
            <td>Add a note to the previous note or chord.</td>
          </tr>
          <tr>
            <td>&#8593;</td>
            <td>Bump the previous note up an octave.</td>
          </tr>
          <tr>
            <td>&#8595;</td>
            <td>Bump the previous note down an octave.</td>
          </tr>
          <tr>
            <td>&#8592;</td>
            <td>Move the cursor back a note or rest.</td>
          </tr>
          <tr>
            <td>&#8594;</td>
            <td>Move the cursor forward a note or rest.</td>
          </tr>
          <tr>
            <td>ctrl+z or &#8984;+z</td>
            <td>Undo the previous action</td>
          </tr>
          <tr>
            <td>shift+ctrl+z or shift+&#8984;+z</td>
            <td>Redo an action that was undone.</td>
          </tr>
        </table>
      </span>
    );
  }

  private renderMIDI(): JSX.Element {
    return (
      <span>
        <h3>How do I enter sheet music using a MIDI keyboard?</h3>
        <p>This feature is coming soon&hellip;</p>
      </span>
    );
    /*<p>
      To insert notes, plug your MIDI keyboard in and
      press a key. Use your computer keyboard or mouse to
      choose the duration of notes to insert, to insert rests,
      and to perform other actions.
    </p>
    <p>
      MIDI keyboard editing is supported in recent versions
      of Chrome and Opera.
    </p>*/
  }

  private renderMouse(): JSX.Element {
    return (
      <span>
        <h3>How do I enter sheet music using a mouse?</h3>
        <p>
          <strong>To insert notes,</strong> click on the desired duration of
          music in the toolbar (e.g., quarter note or half note). Then, click on
          any desired modifiers to that note (e.g., dots, tuplets, or
          accidentals). Finally, click on the staff where you want the note.
        </p>
        <p>
          <strong>To insert chords,</strong> pick a note or chord to add a note
          to, and click above or below it to add that note.
        </p>
        <p>
          <strong>To insert rests,</strong> click the rest icon beside the sharp
          icon on the toolbar, then insert it as you would a note.
        </p>
        <p>
          <strong>To add another bar,</strong> click the "Add Bar" option on the
          toolbar.
        </p>
        <p>
          <strong>Tip:</strong> you can undo and redo any changes using the undo
          and redo buttons, so don't be afraid to explore.
        </p>
      </span>
    );
  }

  private renderRelative(): JSX.Element {
    return (
      <span>
        <h3>What is relative output?</h3>
        <p>
          Use <code>\relative</code> output mode if you are inserting code into
          a <code>\relative</code> block, and leave it unchecked if your song
          uses absolute mode.
        </p>
        <p>
          From the LilyPond manual, absolute octave entry requires specifying
          the octave for every single note. Relative octave entry, in contrast,
          specifies each octave in relation to the last note: changing one
          note’s octave will affect all of the following notes.
        </p>
        <p>
          If this checkbox is not checked, the octave of every note will be
          explicitly spelled out. <code>c'</code> will always mean middle C.
        </p>
        <p>
          When using this mode, after inserting bars of music, you may need to
          adjust the octave of the first note.
        </p>
      </span>
    );
  }

  private renderWhyNotEdit(): JSX.Element {
    return (
      <span>
        <h3>What features does this tool have?</h3>
        <p>
          Use this tool to generate LilyPond markup for one or more bars of
          notes in single voice and staff. You can enter notes using a mouse,
          computer keyboard, or MIDI keyboard. This tool does not support
          editing existing LilyPond markup.
        </p>
        <p>
          This tool can insert notes with their corresponding dynamics and
          markings. Keep an eye out for other tools that help generate LilyPond
          markup for other elements of sheet music!
        </p>
        <p>
          This tool only supports a small subset of LilyPond's features, but
          hopefully saves some time when transcribing music.
        </p>
      </span>
    );
  }
}

// tslint:disable-next-line typedef
const styles = StyleSheet.create({
  overlay: {
    background: "rgba(0, 0, 0, 0.8)",
    bottom: 0,
    cursor: "pointer",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 100000,
  },
  widget: {
    backgroundColor: "#f6f7f7",
    border: "1px solid black",
    borderRadius: 4,
    cursor: "auto",
    left: 15,
    marginBottom: 0,
    padding: 15,
    position: "absolute",
    right: 15,
    top: 50,
  },
});
