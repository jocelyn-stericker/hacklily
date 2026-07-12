// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2017-present Jocelyn Stericker <jocelyn@nettek.ca>

import type * as monacoEditor from "monaco-editor";

import NOTATION_SYMBOLS from "./NOTATION_SYMBOLS";

const LILYPOND_COMPLETION_ITEM_PROVIDER: monacoEditor.languages.CompletionItemProvider =
  {
    provideCompletionItems(
      model: monacoEditor.editor.IReadOnlyModel,
      position: monacoEditor.Position,
      _context: monacoEditor.languages.CompletionContext,
      _token: monacoEditor.CancellationToken,
    ): monacoEditor.languages.CompletionList {
      const textUntilPosition: string = model.getValueInRange({
        endColumn: position.column,
        endLineNumber: position.lineNumber,
        startColumn: 1,
        startLineNumber: 1,
      });
      if (textUntilPosition[textUntilPosition.length - 2] === "\\") {
        return { suggestions: NOTATION_SYMBOLS };
      }

      // Otherwise, Monaco really wants to give us word-based suggestions,
      // which are not helpful on note input.
      return {
        suggestions: [
          {
            kind: 0, // text
            label: "",
            insertText: "",
            range: null,
          },
        ],
      };
    },
  };

export default LILYPOND_COMPLETION_ITEM_PROVIDER;
