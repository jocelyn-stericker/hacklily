// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2017-present Jocelyn Stericker <jocelyn@nettek.ca>

import type * as monacoEditor from "monaco-editor";

import type Commands from "./Commands";

/**
 * Provides codelens shortcuts for lilypond.
 */
export default class CodelensProvider
  implements monacoEditor.languages.CodeLensProvider
{
  commands: Commands;

  constructor(commands: Commands) {
    this.commands = commands;
  }

  provideCodeLenses = (
    model: monacoEditor.editor.IReadOnlyModel,
    _token: monacoEditor.CancellationToken,
  ): monacoEditor.languages.CodeLensList => {
    const lines: string[] = model.getLinesContent();

    type CodeLens = monacoEditor.languages.CodeLens;

    return {
      dispose() {},
      lenses: lines.reduce(
        (memos: CodeLens[], line: string, i: number): CodeLens[] => {
          let memo: CodeLens[] = memos;

          if (line.indexOf("\\clef") !== -1) {
            memo = [
              ...memo,
              {
                command: {
                  arguments: [i],
                  id: this.commands.setClef,
                  title: "Tool: Change Clef",
                },
                range: {
                  endColumn: 1,
                  endLineNumber: i + 2,
                  startColumn: 1,
                  startLineNumber: i + 1,
                },
              },
            ];
          }
          if (line.indexOf("\\key") !== -1) {
            memo = [
              ...memo,
              {
                command: {
                  arguments: [i],
                  id: this.commands.setKey,
                  title: "Tool: Change Key Signature",
                },
                range: {
                  endColumn: 1,
                  endLineNumber: i + 2,
                  startColumn: 1,
                  startLineNumber: i + 1,
                },
              },
            ];
          }
          if (line.indexOf("\\time") !== -1) {
            memo = [
              ...memo,
              {
                command: {
                  arguments: [i],
                  id: this.commands.setTime,
                  title: "Tool: Change Time Signature",
                },
                range: {
                  endColumn: 1,
                  endLineNumber: i + 2,
                  startColumn: 1,
                  startLineNumber: i + 1,
                },
              },
            ];
          }
          if (line.indexOf("\\relative") !== -1) {
            memo = [
              ...memo,
              {
                command: {
                  arguments: [i],
                  id: this.commands.insertNotes,
                  title: "Tool: Insert Notes",
                },
                range: {
                  endColumn: 1,
                  endLineNumber: i + 2,
                  startColumn: 1,
                  startLineNumber: i + 1,
                },
              },
            ];
          }

          return memo;
        },
        [],
      ),
    };
  };

  resolveCodeLens = (
    _model: monacoEditor.editor.IReadOnlyModel,
    codeLens: monacoEditor.languages.CodeLens,
    _token: monacoEditor.CancellationToken,
  ): monacoEditor.languages.CodeLens => {
    return codeLens;
  };
}
