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
import { InjectedIntl } from "react-intl";

import Commands from "./Commands";

/**
 * Provides codelens shortcuts for lilypond.
 */
export default class CodelensProvider
  implements monacoEditor.languages.CodeLensProvider {
  commands: Commands;
  intl: InjectedIntl;

  constructor(commands: Commands, intl: InjectedIntl) {
    this.commands = commands;
    this.intl = intl;
  }

  provideCodeLenses = (
    model: monacoEditor.editor.IReadOnlyModel,
    token: monacoEditor.CancellationToken,
  ): monacoEditor.languages.ICodeLensSymbol[] => {
    const lines: string[] = model.getLinesContent();
    const { formatMessage } = this.intl;

    type sym = monacoEditor.languages.ICodeLensSymbol;

    return lines.reduce((memos: sym[], line: string, i: number): sym[] => {
      let memo: sym[] = memos;

      if (line.indexOf("\\clef") !== -1) {
        memo = [
          ...memo,
          {
            command: {
              arguments: [i],
              id: this.commands.setClef,
              title: formatMessage({
                id: "CodelensProvider.clef",
                defaultMessage: "Click here to change the clef.",
              }),
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
              title: formatMessage({
                id: "CodelensProvider.keySig",
                defaultMessage: "Click here to change the key signature.",
              }),
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
              title: formatMessage({
                id: "CodelensProvider.time",
                defaultMessage: "Click here to change the time signature",
              }),
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
              title: formatMessage({
                id: "CodelensProvider.insertNotes",
                defaultMessage:
                  "Click here to insert notes with your mouse / keyboard.",
              }),
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
    }, []);
  };

  resolveCodeLens = (
    model: monacoEditor.editor.IReadOnlyModel,
    codeLens: monacoEditor.languages.ICodeLensSymbol,
    token: monacoEditor.CancellationToken,
  ): monacoEditor.languages.ICodeLensSymbol => {
    return codeLens;
  };
}
