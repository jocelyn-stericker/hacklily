/**
 * @license
 * This file is part of Hacklily, a web-based LilyPond editor.
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

import * as monacoEditor from "monaco-editor";

/**
 * These are monaco commands. So far we use them in codelens actions (see codelensProvider)
 */
export default class Commands {
  insertNotes: string = "";
  setClef: string = "";
  setKey: string = "";
  setTime: string = "";
  showMakelily: (tool: string, cb?: (ly: string) => void) => void;

  constructor(showMakelily: (tool: string) => void) {
    this.showMakelily = showMakelily;
  }

  clear(): void {
    this.insertNotes = "";
    this.setClef = "";
    this.setKey = "";
    this.setTime = "";
  }

  init(editor: monacoEditor.editor.IStandaloneCodeEditor): void {
    function moveToStartOfNextLine(lineIdx: number): void {
      editor.setPosition({
        column: 1,
        lineNumber: lineIdx + 2,
      });
    }

    function replaceLine(lineIdx: number, ly: string): void {
      const model = editor.getModel();
      if (!model) {
        return;
      }
      const whitespace: RegExpMatchArray | null = model
        .getLinesContent()
        [lineIdx].match(/^\s*/);
      const whitespacePrefix: string = whitespace ? whitespace[0] : "";

      const range: monacoEditor.Range = new monacoEditor.Range(
        lineIdx + 1,
        1,
        lineIdx + 2,
        1,
      );
      const op: monacoEditor.editor.IIdentifiedSingleEditOperation = {
        forceMoveMarkers: false,
        range,
        text: `${whitespacePrefix}${ly}`,
      };
      editor.executeEdits("hacklily", [op]);
    }

    this.setClef =
      editor.addCommand(
        Number.MAX_VALUE,
        (internal: void, lineIdx: number): void => {
          moveToStartOfNextLine(lineIdx);
          this.showMakelily("clef", (ly: string) => {
            replaceLine(lineIdx, ly);
          });
        },
        "",
      ) || "";
    this.setKey =
      editor.addCommand(
        Number.MAX_VALUE,
        (internal: void, lineIdx: number): void => {
          moveToStartOfNextLine(lineIdx);
          this.showMakelily("key", (ly: string) => {
            replaceLine(lineIdx, ly);
          });
        },
        "",
      ) || "";
    this.setTime =
      editor.addCommand(
        Number.MAX_VALUE,
        (internal: void, lineIdx: number): void => {
          moveToStartOfNextLine(lineIdx);
          this.showMakelily("time", (ly: string) => {
            replaceLine(lineIdx, ly);
          });
        },
        "",
      ) || "";
    this.insertNotes =
      editor.addCommand(
        Number.MAX_VALUE,
        (internal: void, lineIdx: number): void => {
          moveToStartOfNextLine(lineIdx);
          this.showMakelily("notes");
        },
        "",
      ) || "";
  }
}
