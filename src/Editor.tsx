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

import { css } from 'aphrodite';
import React from 'react';
import ReactMonacoEditor from 'react-monaco-editor';
import { MODE_EDIT, MODE_VIEW, ViewMode } from './Header';
import './lilymonaco.css';
import LILYPOND_COMPLETION_ITEM_PROVIDER from './monacoConfig/LILYPOND_COMPLETION_ITEM_PROVIDER';
import LILYPOND_MONARCH_PROVIDER from './monacoConfig/LILYPOND_MONARCH_PROVIDER';
import { APP_STYLE } from './styles';

interface EditorProps {
  code: string | undefined;
  defaultSelection: monaco.ISelection | null;
  logs: string | null;
  mode: ViewMode;
  onSetCode(newCode: string): void;
}

export default class Editor extends React.PureComponent<EditorProps, void> {
  private oldDecorations: string[] = [];
  private editor: monaco.editor.ICodeEditor;

  render(): JSX.Element {
    const { code, mode, onSetCode } = this.props;
    const monacoOptions: monaco.editor.IEditorOptions = {
      autoClosingBrackets: true,
      selectionHighlight: false,
      wordBasedSuggestions: false,
      readOnly: !code,
    };
    return (
      <div className={css(APP_STYLE.monaco, mode === MODE_VIEW && APP_STYLE.monacoHidden)}>
        <ReactMonacoEditor
          editorDidMount={this.handleEditorDidMount}
          editorWillMount={this.handleEditorWillMount}
          height="100%"
          language="lilypond"
          onChange={onSetCode}
          options={monacoOptions}
          theme="vs-dark"
          value={code}
          width={mode === MODE_EDIT ? '100%' : '50%'}
        />
      </div>
    );
  }

  componentDidUpdate(prevProps: EditorProps): void {
    const { mode, logs, defaultSelection } = this.props;
    if (prevProps.mode !== mode) {
      this.editor.layout();
    }
    if (prevProps.logs !== logs) {
      const errors: monaco.editor.IModelDeltaDecoration[] = [];
      const matchErrors: RegExp =
        /hacklily.ly:([0-9]*):(([0-9]*):([0-9]*))?\s*([ew].*)/g;
      if (this.editor) {
        const oldDecorations: string[] = this.oldDecorations || [];
        if (logs) {
          for (let error: RegExpExecArray | null = matchErrors.exec(logs); error;
              error = matchErrors.exec(logs)) {
            errors.push({
              range: {
                // we insert a line on the server:
                startLineNumber: parseInt(error[1], 10) - 1,
                endLineNumber: parseInt(error[1], 10) - 1,

                startColumn: parseInt(error[3], 10),
                endColumn: parseInt(error[4] || String((parseInt(error[2], 10) + 1)), 10),
              },
              options: {
                linesDecorationsClassName: css(APP_STYLE.errorDecoration),
                inlineClassName: 'lilymonaco-inline-error',
                hoverMessage: error[5],
              },
            });
          }
        }
        this.oldDecorations = this.editor.deltaDecorations(oldDecorations, errors);
      }
    }
    if (prevProps.defaultSelection !== defaultSelection && defaultSelection !== null) {
      this.editor.setSelection(defaultSelection);
      this.editor.focus();
    }
  }

  componentWillUnmount(): void {
    window.removeEventListener('resize', this.handleResize);
  }

  private handleEditorWillMount = (monacoModule: typeof monaco): void => {
    monacoModule.languages.register({ id: 'lilypond' });
    monacoModule.languages.setMonarchTokensProvider('lilypond', LILYPOND_MONARCH_PROVIDER);
    monacoModule.languages.registerCompletionItemProvider(
            'lilypond', LILYPOND_COMPLETION_ITEM_PROVIDER);
  }

  private handleEditorDidMount = (editor: monaco.editor.ICodeEditor,
                                  monacoModule: typeof monaco): void => {
    editor.focus();
    this.editor = editor;
    window.addEventListener('resize', this.handleResize, false);
  }

  private handleResize = (): void => {
    this.editor.layout();
  }
}
