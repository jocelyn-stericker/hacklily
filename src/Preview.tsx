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

import { css } from "aphrodite";
import DOMPurify from "dompurify";
import * as monacoEditor from "monaco-editor";
import React from "react";

import { FormattedMessage } from "react-intl";
import { decodeArrayBuffer } from "./base64Binary";
import { MODE_BOTH, MODE_VIEW, ViewMode } from "./Header";
import Logs from "./Logs";
import RPCClient, { RenderResponse } from "./RPCClient";
import { APP_STYLE, BUTTON_STYLE } from "./styles";
import debounce from "./util/debounce";

/**
 * How long the code must not be edited for a preview to render.
 */
const DEBOUNCE_REFERSH_TIMEOUT: number = 1000;

/**
 * HTML with a #root element under which the svgs will be inserted.
 *
 * Note: Chrome doesn't render font-face in inline CSS.
 */
const BODY_IFRAME_TEMPLATE: string = `
<link rel="stylesheet" type="text/css" href="/preview.css">
<div id="root"></div>
`;

interface Props {
  /**
   * The source to render.
   *
   * When this changes, the preview will update (but maybe not right away -- see
   * DEBOUNCE_REFRESH_TIMEOUT).
   */
  code: string;

  /**
   * Whether or not to use RPC.
   *
   * rpc must be null if and only if isStandalone is set.
   */
  isStandalone: boolean;

  /**
   * The logs to render in the Logs button.
   *
   * Although the logs are generated here, it's not stored here to -- that way the parent
   * stays the single source of truth for the logs.
   */
  logs: string | null;

  /**
   * Whether the preview is full-page, half-page, or hidden.
   */
  mode: ViewMode;

  /**
   * Client to use to request the SVG and logs.
   *
   * rpc must be null if and only if isStandalone is set.
   */
  rpc: RPCClient | null;

  onShowDownload(): void;

  /**
   * Called whenever a preview is rendered. The parent should in turn re-render,
   * settings the logs prop on this component and <Editor />.
   */
  onLogsObtained(logs: string | null, version: "stable" | "unstable"): void;

  onMidiObtained(midi: ArrayBuffer | null): void;

  /**
   * Called whenever a note is clicked. The parent should let the <Editor /> know
   * so it can focus where the note is defined.
   */
  onSelectionChanged(selection: monacoEditor.ISelection | null): void;

  standaloneRender(
    src: string,
    filetype: string,
  ): Promise<{ content: string[]; logs: string }>;
}

interface State {
  error: string | null;
  pendingPreviews: number;
  previewAlreadyDirty: boolean;
}

/**
 * Makes the logs easier to read by hiding details not relevant to the user.
 */
function cleanLogs(logs: string): string {
  return (
    logs
      // Move wrapper errors to the start of the page.
      .replace(
        /\/tmp\/lyp\/wrappers\/hacklily.ly:([0-9]*):([0-9]*)/g,
        "/tmp/hacklily.ly:2:1",
      )
      // Hide confusing reference to lyp
      .replace(/`\/tmp\/lyp\/wrappers\/hacklily.ly'/g, "`hacklily-wrapper.ly'")
      .replace(/^Lyp.*\n/gm, "")
      .replace(/^GNU LilyPond Server.*[\n\s]*/gm, "")
      // Remove prompt
      .replace(/^>\s*\n?/gm, "")
  );
}

/**
 * Renders an SVG preview of the song in an iframe.
 *
 * The SVG is retreived from the backend server via the RPCClient.
 *
 * On update, it sends back the logs to the parent so that it can be used to highlight
 * errors in the editor. See onLogsObtained.
 *
 * When you click a note, it fires onSelectionChanged so that the editor can highlight
 * where the note is defined.
 */
export default class Preview extends React.PureComponent<Props, State> {
  state: State = {
    error: null,
    pendingPreviews: 0,
    previewAlreadyDirty: false,
  };

  private iframeLoaded: boolean = false;
  private previousMIDIData: string | null = null;
  private sheetMusicView: HTMLIFrameElement | null = null;

  componentDidMount(): void {
    this.fetchNewPreview();
  }

  componentDidUpdate(prevProps: Props): void {
    if (prevProps.code !== this.props.code) {
      this.fetchNewPreview();
    }
    if (prevProps.mode !== this.props.mode) {
      this.handleModeDidChange();
    }
  }

  render(): JSX.Element {
    const { mode, logs } = this.props;
    const { pendingPreviews, error } = this.state;
    const previewMaskStyle: string = css(
      APP_STYLE.pendingPreviewMask,
      mode === MODE_VIEW && APP_STYLE.previewPendingMaskModeView,
    );

    // WARNING: The iframe is NOT sandboxed so we can write to the iframe and so
    // that we can add a click event (see onSelectionChanged).

    // tslint:disable:react-iframe-missing-sandbox -- see above
    return (
      <div style={{ backgroundColor: "white" }}>
        <iframe
          className={css(APP_STYLE.sheetMusicView)}
          frameBorder="0"
          height="100%"
          ref={this.handleSetSheetMusicView}
          width={mode === MODE_BOTH ? "50%" : mode === MODE_VIEW ? "100%" : "0"}
        />
        {pendingPreviews > 0 && <div className={previewMaskStyle} />}
        {error && <div className={css(APP_STYLE.errorMask)}>{error}</div>}
        {this.renderDownload()}
        <Logs logs={logs} />
      </div>
    );
    // tslint:enable:react-iframe-missing-sandbox
  }

  @debounce(DEBOUNCE_REFERSH_TIMEOUT)
  private async fetchNewPreview(): Promise<void> {
    if (this.state.pendingPreviews) {
      this.setState({
        previewAlreadyDirty: true,
      });

      return;
    }

    this.setState({
      pendingPreviews: this.state.pendingPreviews + 1,
    });

    if (!this.iframeLoaded) {
      this.handleIFrameLoaded();
    }

    const { code, isStandalone, rpc } = this.props;

    let version: "stable" | "unstable" = "stable";

    try {
      let dirtyLogs: string;
      let midi: string | null;
      let files: string[];

      if (isStandalone) {
        const reply: {
          content: string[];
          logs: string;
        } = await this.props.standaloneRender(code, "svg");
        files = reply.content;
        dirtyLogs = reply.logs;
        midi = null; // TODO(joshuan)
      } else {
        if (!rpc) {
          throw new Error("If not standalone, rpc must be set!");
        }

        // Decide whether to use the stable version or not.
        const maybeVersion = /\\version\s*"(\d+)\.?(\d+)?\.?(\d+)?/gm.exec(
          code,
        );
        const versionSlices = maybeVersion
          ? maybeVersion.slice(1).map(v => parseInt(v, 10))
          : [];
        const isUnstable = versionSlices[0] === 2 && versionSlices[1] > 18;
        version = isUnstable ? "unstable" : "stable";

        const response: RenderResponse = await rpc.call("render", {
          backend: "svg",
          src: code,
          version,
        });

        files = response.result.files;
        dirtyLogs = response.result.logs;
        midi = response.result.midi || null;
      }

      const logs: string = cleanLogs(dirtyLogs);

      if (!this.sheetMusicView) {
        throw new Error("Could not get frame's window");
      }

      if (!this.sheetMusicView.contentWindow) {
        throw new Error("Could not get frame's window");
      }

      const root = this.sheetMusicView.contentWindow.document.getElementById(
        "root",
      );

      if (!root) {
        throw new Error("Could not get sheet music view root!");
      }

      // If we've gotten into an error state, keep the existing height
      // so that we don't rescroll on update.
      root.style.minHeight =
        files.length === 0 || files[0].trim() === ""
          ? `${root.scrollHeight}px`
          : null;

      // tslint:disable-next-line:no-inner-html no-object-literal-type-assertion -- types are wrong
      root.innerHTML = DOMPurify.sanitize(files.join(""), {
        ALLOW_UNKNOWN_PROTOCOLS: true,
      } as object);

      this.props.onLogsObtained(logs, version);
      if (midi !== this.previousMIDIData) {
        if (midi) {
          this.props.onMidiObtained(decodeArrayBuffer(midi.replace(/\s/g, "")));
        } else {
          this.props.onMidiObtained(null);
        }
      }
      this.previousMIDIData = midi;

      const svgs: SVGSVGElement[] = Array.from(
        root.getElementsByTagName("svg"),
      );
      for (const svg of svgs) {
        svg.removeAttribute("width");
        svg.removeAttribute("height");
      }
      this.setState({
        pendingPreviews: this.state.pendingPreviews - 1,
      });
      if (this.state.previewAlreadyDirty) {
        this.setState({
          error: null,
          previewAlreadyDirty: false,
        });
        this.fetchNewPreview();
      }

      return;
    } catch (err) {
      this.setState({
        pendingPreviews: this.state.pendingPreviews - 1,
        previewAlreadyDirty: true,
      });
    }
  }

  private handleIFrameLoaded = (): void => {
    if (this.sheetMusicView && this.sheetMusicView.contentWindow) {
      const body: HTMLElement = this.sheetMusicView.contentWindow.document.body;
      // tslint:disable-next-line:no-inner-html
      body.innerHTML = BODY_IFRAME_TEMPLATE;
      body.addEventListener("click", (ev: MouseEvent) => {
        ev.preventDefault();
        let target: HTMLElement | null = ev.target as HTMLElement | null;
        while (target && target.localName !== "a") {
          target = target.parentElement;
        }
        if (target && target.localName === "a") {
          const link: string | null = target.getAttribute("xlink:href");
          if (!link) {
            return;
          }
          const pathAndLocation: string[] = link.split(".ly:");
          if (pathAndLocation.length === 2) {
            const [line, startColumn, endColumn] = pathAndLocation[1].split(
              ":",
            );
            this.props.onSelectionChanged({
              // NOTE: we add a line on render:
              positionColumn: parseInt(endColumn, 10) + 1,
              positionLineNumber: parseInt(line, 10) - 1,
              selectionStartColumn: parseInt(startColumn, 10) + 1,
              selectionStartLineNumber: parseInt(line, 10) - 1,
            });
          }
        }
      });
    }
    this.handleModeDidChange();
    this.iframeLoaded = true;
  };

  private handleModeDidChange = (): void => {
    if (this.sheetMusicView && this.sheetMusicView.contentWindow) {
      const body: HTMLElement = this.sheetMusicView.contentWindow.document.body;
      body.classList.remove("modeBoth", "modeView", "modeEdit");
      switch (this.props.mode) {
        case MODE_BOTH:
          body.classList.add("modeBoth");
          break;
        case MODE_VIEW:
          body.classList.add("modeView");
          break;
        default:
          body.classList.add("modeEdit");
          break;
      }
    }
  };

  private handleSetSheetMusicView = (
    sheetMusicView: HTMLIFrameElement,
  ): void => {
    this.sheetMusicView = sheetMusicView;
  };

  private renderDownload(): JSX.Element {
    return (
      <a
        href="javascript:void(0)"
        onClick={this.props.onShowDownload}
        className={css(BUTTON_STYLE.buttonStyle, APP_STYLE.downloadButton)}
      >
        <i className="fa fa-download" />{" "}
        <FormattedMessage id="Preview.download" defaultMessage="Export" />
      </a>
    );
  }
}
