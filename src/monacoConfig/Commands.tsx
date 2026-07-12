// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2017-present Jocelyn Stericker <jocelyn@nettek.ca>

import * as monacoEditor from "monaco-editor";

/**
 * These are monaco commands. So far we use them in codelens actions (see codelensProvider)
 */
export default class Commands {
  insertNotes = "";
  setClef = "";
  setKey = "";
  setTime = "";
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
