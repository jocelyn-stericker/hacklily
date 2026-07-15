// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2017-present Jocelyn Stericker <jocelyn@nettek.ca>

import { Lock, TriangleAlert } from "lucide-react";
import * as monacoEditor from "monaco-editor";
import React from "react";
import ReactMonacoEditor from "react-monaco-editor";

import { cn } from "#/lib/utils";
import CodelensProvider from "#/monacoConfig/CodelensProvider";
import Commands from "#/monacoConfig/Commands";
import LILYPOND_COMPLETION_ITEM_PROVIDER from "#/monacoConfig/LILYPOND_COMPLETION_ITEM_PROVIDER";
import LILYPOND_MONARCH_PROVIDER from "#/monacoConfig/LILYPOND_MONARCH_PROVIDER";

import type { ViewMode } from "./Header";
import { MODE_EDIT, MODE_VIEW } from "./Header";
import { APP_STYLE } from "./styles";

let registeredMonacoComponents = false;

export interface MakelilyProps {
  makelilyClef: string;
  makelilyKey: string;
  makelilyTime: string;
}

interface Props {
  code: string | undefined;

  colourScheme: "dark" | "light";

  /**
   * When this changes, the selection changes. Used so that when you click on a
   * note in the preview, it highlights where the note is defined in the editor.
   */
  defaultSelection: monacoEditor.ISelection | null;

  hideUnstableNotification: boolean;

  isImmutableSrc: boolean;

  /**
   * Lilypond logs -- used to render errors
   */
  logs: string | null;

  /**
   * Whether we're visible, half-screen, or hidden.
   */
  mode: ViewMode;

  readOnly: boolean;

  rendererVersion: "stable" | "unstable";

  /**
   * Called when an edit occurs. <Editor /> is a controlled component.
   */
  onSetCode(newCode: string): void;
  onHideUnstableNotification(): void;
  showMakelily(tool?: string, cb?: (ly: string) => void): void;
}

/**
 * Renders the left-hand side of the App UI. This is a small wrapper around monaco.
 *
 * It is a controlled component, and parses the passed logs to render errors.
 */
export default class Editor extends React.PureComponent<Props> {
  private commands: Commands = new Commands(
    (tool: string, cb?: (ly: string) => void): void => {
      this.props.showMakelily(tool, cb);
    },
  );
  private editor: monacoEditor.editor.ICodeEditor | undefined;
  private oldDecorations: string[] = [];

  componentDidUpdate(prevProps: Props): void {
    if (this.editor === undefined) {
      return;
    }

    const { mode, logs, defaultSelection } = this.props;
    if (prevProps.mode !== mode) {
      this.editor.layout();
    }
    if (prevProps.logs !== logs) {
      const errors: monacoEditor.editor.IModelDeltaDecoration[] = [];
      const matchErrors =
        /hacklily.ly:([0-9]*):(([0-9]*):([0-9]*))?\s*([ew].*)/g;
      const oldDecorations: string[] = this.oldDecorations || [];
      if (logs) {
        for (
          let error: RegExpExecArray | null = matchErrors.exec(logs);
          error;
          error = matchErrors.exec(logs)
        ) {
          errors.push({
            options: {
              hoverMessage: {
                isTrusted: false,
                value: error[5],
              },
              inlineClassName: "lilymonaco-inline-error",
              linesDecorationsClassName: cn(APP_STYLE.errorDecoration),
            },
            range: {
              // we insert a line on the server:
              endColumn: parseInt(
                error[4] || String(parseInt(error[2], 10) + 1),
                10,
              ),
              endLineNumber: parseInt(error[1], 10) - 1,
              startColumn: parseInt(error[3], 10),
              startLineNumber: parseInt(error[1], 10) - 1,
            },
          });
        }
        this.oldDecorations = this.editor.deltaDecorations(
          oldDecorations,
          errors,
        );
      }
    }
    if (
      prevProps.defaultSelection !== defaultSelection &&
      defaultSelection !== null
    ) {
      this.editor.setSelection(defaultSelection);
      this.editor.revealLineInCenter(defaultSelection.selectionStartLineNumber);
      this.editor.focus();
    }
  }

  componentWillUnmount(): void {
    window.removeEventListener("resize", this.handleResize);
  }

  find(): void {
    if (this.editor) {
      this.editor.trigger("host", "actions.find", undefined);
    }
  }

  findNext(): void {
    if (this.editor) {
      this.editor.trigger(
        "host",
        "editor.action.nextMatchFindAction",
        undefined,
      );
    }
  }

  getMakelilyProperties(): MakelilyProps {
    const timeRegex = /\\time.*/g;
    const clefRegex = /\\clef.*/g;
    const keyRegex = /\\key.*/g;
    const code: string = this.props.code || "";
    function extractFirst(match: RegExpMatchArray | null): string | null {
      if (match) {
        return match[0];
      }

      return null;
    }
    function extractLast(match: RegExpMatchArray | null): string | null {
      if (match) {
        return match[match.length - 1];
      }

      return null;
    }
    const meta: MakelilyProps = {
      makelilyClef: (
        extractFirst(code.match(clefRegex)) || "\\clef treble"
      ).replace("\\clef ", ""),
      makelilyKey: (
        extractFirst(code.match(keyRegex)) || "\\key c \\major"
      ).replace("\\key ", ""),
      makelilyTime: (
        extractFirst(code.match(timeRegex)) || "\\time 4/4"
      ).replace("\\time ", ""),
    };

    if (!this.editor) {
      return meta;
    }

    let codeBeforeCursor = "";
    const lines: string[] = code.split("\n");
    const line: monacoEditor.Position | null = this.editor.getPosition();

    if (line) {
      for (let i = 0; i < line.lineNumber - 1; i += 1) {
        codeBeforeCursor += `${lines[i]}\n`;
      }
      codeBeforeCursor += lines[line.lineNumber - 1].slice(0, line.column);
    }

    meta.makelilyClef = (
      extractLast(codeBeforeCursor.match(clefRegex)) || meta.makelilyClef
    ).replace("\\clef ", "");
    meta.makelilyKey = (
      extractLast(codeBeforeCursor.match(keyRegex)) || meta.makelilyKey
    ).replace("\\key ", "");
    meta.makelilyTime = (
      extractLast(codeBeforeCursor.match(timeRegex)) || meta.makelilyTime
    ).replace("\\time ", "");

    return meta;
  }

  insertText(text: string): void {
    if (!this.editor) {
      return;
    }

    const line: monacoEditor.Position | null = this.editor.getPosition();
    if (line) {
      const range: monacoEditor.Range = new monacoEditor.Range(
        line.lineNumber,
        1,
        line.lineNumber,
        1,
      );
      const op: monacoEditor.editor.IIdentifiedSingleEditOperation = {
        forceMoveMarkers: true,
        range,
        text,
      };
      this.editor.executeEdits("hacklily", [op]);
    }
  }

  render(): JSX.Element | null {
    const {
      code,
      mode,
      onSetCode,
      readOnly,
      rendererVersion,
      onHideUnstableNotification,
      hideUnstableNotification,
    } = this.props;
    const monacoOptions: monacoEditor.editor.IEditorOptions = {
      autoClosingBrackets: "always",
      minimap: {
        enabled: false,
      },
      readOnly,
      selectionHighlight: false,
    };

    const width = mode === MODE_EDIT ? "100%" : "50%";

    let readOnlyNotice: JSX.Element | null = null;
    if (readOnly) {
      if (this.props.isImmutableSrc) {
        readOnlyNotice = (
          <div
            className={cn(APP_STYLE.urgentEditorNotification)}
            style={{ width }}
          >
            <Lock size="1em" /> to edit, save a copy of this song to your
            library.
          </div>
        );
      } else {
        readOnlyNotice = (
          <div
            className={cn(APP_STYLE.urgentEditorNotification)}
            style={{ width }}
          >
            <Lock size="1em" /> read-only &mdash; to edit, log in as the owner
            or save a copy
          </div>
        );
      }
    }

    let unstableVersionNotice: JSX.Element | null = null;
    if (rendererVersion === "unstable" && !hideUnstableNotification) {
      unstableVersionNotice = (
        <div
          className={cn(APP_STYLE.urgentEditorNotification)}
          style={{ width }}
        >
          <TriangleAlert size="1em" className="inline" /> This song uses
          LilyPond 2.27, which is an unstable development version and may change
          without notice.{" "}
          <a
            onClick={onHideUnstableNotification}
            className={cn(APP_STYLE.urgentEditorNotificationClose)}
            href="javascript:void(0)"
          >
            I understand.
          </a>
        </div>
      );
    }

    if (code === null || code === undefined) {
      return null;
    }

    // NOTE: we have to key ReactMonacoEditor, because we need to force a reload
    // when that changes.
    return (
      <div
        className={cn("monaco", mode === MODE_VIEW && APP_STYLE.monacoHidden)}
      >
        {readOnlyNotice}
        {unstableVersionNotice}
        <ReactMonacoEditor
          key={readOnly ? "read-only" : "read-write"}
          editorDidMount={this.handleEditorDidMount}
          editorWillMount={this.handleEditorWillMount}
          height="100%"
          language="lilypond"
          onChange={onSetCode}
          options={monacoOptions}
          theme={this.props.colourScheme === "dark" ? "vs-dark" : "vs"}
          value={code}
          width={width}
        />
      </div>
    );
  }

  selectAll(): void {
    if (this.editor) {
      this.editor.trigger("host", "editor.action.selectAll", undefined);
    }
  }

  private handleEditorDidMount = (
    editor: monacoEditor.editor.IStandaloneCodeEditor,
    _monacoModule: typeof monacoEditor,
  ): void => {
    editor.focus();
    this.editor = editor;
    window.addEventListener("resize", this.handleResize, false);
    this.commands.init(editor);
    editor.updateOptions({
      wordBasedSuggestions: "off",
    });
  };

  private handleEditorWillMount = (monacoModule: typeof monacoEditor): void => {
    if (registeredMonacoComponents) {
      return;
    }
    registeredMonacoComponents = true;

    monacoModule.languages.register({ id: "lilypond" });
    monacoModule.languages.setMonarchTokensProvider(
      "lilypond",
      LILYPOND_MONARCH_PROVIDER,
    );
    monacoModule.languages.registerCompletionItemProvider(
      "lilypond",
      LILYPOND_COMPLETION_ITEM_PROVIDER,
    );

    monacoModule.languages.registerCodeLensProvider(
      "lilypond",
      new CodelensProvider(this.commands),
    );
  };

  private handleResize = (): void => {
    if (this.editor) {
      this.editor.layout();
    }
  };
}
