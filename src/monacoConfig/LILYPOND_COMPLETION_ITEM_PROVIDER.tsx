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

import NOTATION_SYMBOLS from "./NOTATION_SYMBOLS";

const LILYPOND_COMPLETION_ITEM_PROVIDER: monacoEditor.languages.CompletionItemProvider = {
  provideCompletionItems(
    model: monacoEditor.editor.IReadOnlyModel,
    position: monacoEditor.Position,
    token: monacoEditor.CancellationToken,
  ): monacoEditor.languages.CompletionItem[] {
    const textUntilPosition: string = model.getValueInRange({
      endColumn: position.column,
      endLineNumber: position.lineNumber,
      startColumn: 1,
      startLineNumber: 1,
    });
    if (textUntilPosition[textUntilPosition.length - 2] === "\\") {
      return NOTATION_SYMBOLS;
    }

    // Otherwise, Monaco really wants to give us word-based suggestions,
    // which are not helpful on note input.
    return [
      {
        kind: 0, // text
        label: "",
      },
    ];
  },
};

export default LILYPOND_COMPLETION_ITEM_PROVIDER;
