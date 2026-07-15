// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2017-present Jocelyn Stericker <jocelyn@nettek.ca>

import DOMPurify from "dompurify";
import { debounce } from "lodash";
import type * as monacoEditor from "monaco-editor";
import React from "react";

import { track } from "#/lib/analytics";
import { decodeArrayBuffer } from "#/lib/base64Binary";
import { renderVersionFor } from "#/lib/lilypondVersion";
import type { SvgRenderer } from "#/lib/SvgRenderer";
import { cn } from "#/lib/utils";

import type { ViewMode } from "./Header";
import { MODE_BOTH, MODE_VIEW } from "./Header";
import Logs from "./Logs";
import { APP_STYLE } from "./styles";

// ─────────────────────────────────────────────────────────────
// DOMPurify hooks
// ─────────────────────────────────────────────────────────────

// Restrict <use> href/xlink:href to internal #fragment identifiers only.
// External URIs (https:, data:, javascript:) are blocked at the attribute
// level so the <use> element itself (allowed via ADD_TAGS in sanitize()) is
// preserved but rendered inert. The hook is idempotent — if HMR registers
// it twice, both invocations set keepAttr = false (or not), always the same.
DOMPurify.addHook(
  "uponSanitizeAttribute",
  function hacklily_use_fragment_only(node, hookEvent) {
    if (
      node.nodeName?.toLowerCase() === "use" &&
      (hookEvent.attrName === "href" || hookEvent.attrName === "xlink:href")
    ) {
      if (!hookEvent.attrValue.startsWith("#")) {
        hookEvent.keepAttr = false;
      }
    }
  },
);

/**
 * Pattern: a CSS-function `url(#…)` reference to a same-document fragment.
 * Captures the fragment identifier so it can be prefixed.
 */
const URL_FRAGMENT_RE = /url\(\s*#([^)\s]+)\s*\)/g;

/**
 * Sanitize SVG/HTML and prefix every `id` and fragment reference with
 * a caller-chosen string, isolating this batch of markup from others
 * rendered into the same document.
 *
 * The hook:
 *  - Prefixes `id` attribute values so glyphs, clips, gradients etc.
 *    don't collide across score previews.
 *  - Prefixes fragment references in `<use href/xlink:href="#…">` so
 *    glyph lookups still resolve after the rename.
 *  - Prefixes fragments inside `url(#…)` in styling attributes
 *    (`clip-path`, `fill`, `mask`, `style`, etc.) so CSS and
 *    presentation-attribute references stay correct.
 */
export function sanitizeSvg(dirty: string, idPrefix: string): string {
  const hook = function prefixIds(
    node: Element,
    hookEvent: Record<string, any>,
  ) {
    // Skip attributes already stripped by an earlier hook.
    if (hookEvent.keepAttr === false) {
      return;
    }

    const lcName = hookEvent.attrName;
    let value = hookEvent.attrValue;
    let changed = false;

    if (lcName === "id") {
      // Prefix every id — the hook fires once per attribute, so each id
      // gets visited exactly once.
      if (typeof value === "string" && !value.startsWith(idPrefix)) {
        value = idPrefix + value;
        changed = true;
      }
    } else if (
      (lcName === "href" || lcName === "xlink:href") &&
      node.nodeName?.toLowerCase() === "use"
    ) {
      // Prefix #fragment references on <use> so they still point to the
      // renamed glyph/g id.
      if (typeof value === "string" && value.startsWith("#")) {
        value = "#" + idPrefix + value.slice(1);
        changed = true;
      }
    } else if (typeof value === "string") {
      // Prefix fragments inside url(#…) — covers clip-path, fill, mask,
      // filter, marker-*, and inline style.
      const replaced = value.replace(
        URL_FRAGMENT_RE,
        (_match: string, fragment: string) => `url(#${idPrefix}${fragment})`,
      );
      if (replaced !== value) {
        value = replaced;
        changed = true;
      }
    }

    if (changed) {
      hookEvent.attrValue = value;
    }
  };

  DOMPurify.addHook("uponSanitizeAttribute", hook);
  try {
    return DOMPurify.sanitize(dirty, {
      ALLOW_UNKNOWN_PROTOCOLS: true,
      ADD_TAGS: ["use"],
      ADD_ATTR: ["pointer-events"],
    });
  } finally {
    DOMPurify.removeHook("uponSanitizeAttribute", hook);
  }
}

/**
 * How long the code must not be edited for a preview to render.
 */
const DEBOUNCE_REFERSH_TIMEOUT = 1000;

/**
 * HTML with a #root element under which the svgs will be inserted.
 *
 * Note: Chrome doesn't render font-face in inline CSS.
 */
const BODY_IFRAME_TEMPLATE = `
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
   * Renderer used to engrave the source to SVG. Backed by the server over
   * the WebSocket today; a wasm worker renderer is planned for the /wasm
   * route.
   */
  renderer: SvgRenderer;

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
        "/tmp/hacklily.ly:$1:$2",
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
 * The SVG is retrieved from the backend server (or, on /wasm, a local wasm
 * worker) via the SvgRenderer.
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

  private iframeLoaded = false;
  private previousMIDIData: string | null = null;
  private sheetMusicView: HTMLIFrameElement | null = null;

  componentDidMount(): void {
    void this.fetchNewPreview();
  }

  componentDidUpdate(prevProps: Props): void {
    if (prevProps.code !== this.props.code) {
      void this.fetchNewPreview();
    }
    if (prevProps.mode !== this.props.mode) {
      this.handleModeDidChange();
    }
  }

  render(): JSX.Element {
    const { mode, logs } = this.props;
    const { pendingPreviews, error } = this.state;
    const previewMaskStyle: string = cn(
      APP_STYLE.pendingPreviewMask,
      mode === MODE_VIEW && APP_STYLE.previewPendingMaskModeView,
    );

    // WARNING: The iframe is NOT sandboxed so we can write to the iframe and so
    // that we can add a click event (see onSelectionChanged).

    return (
      <div className="bg-background border-l border-black">
        <iframe
          className={cn(APP_STYLE.sheetMusicView)}
          height="100%"
          ref={this.handleSetSheetMusicView}
          width={mode === MODE_BOTH ? "50%" : mode === MODE_VIEW ? "100%" : "0"}
        />
        {pendingPreviews > 0 && <div className={previewMaskStyle} />}
        {error && (
          <div
            className={cn(
              "bg-black text-white absolute inset-y-0 left-[50%] p-4 text-center w-[50%]",
            )}
          >
            {error}
          </div>
        )}
        <Logs
          logs={logs}
          loading={!logs || logs.length === 0 || pendingPreviews > 0}
        />
      </div>
    );
  }

  private fetchNewPreview = debounce(async () => {
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

    const { code, renderer } = this.props;

    let version: "stable" | "unstable" = "stable";

    try {
      if (!renderer) {
        throw new Error("renderer must be set!");
      }

      version = renderVersionFor(code);

      const result = await renderer.renderSvg(code, version);

      const files: string[] = result.files;
      const dirtyLogs = result.logs;
      const midi = result.midi || null;
      const warnings = result.warnings ?? 0;
      const errors = result.errors ?? 0;

      const logs: string = cleanLogs(dirtyLogs);

      if (!this.sheetMusicView) {
        throw new Error("Could not get frame's window");
      }

      if (!this.sheetMusicView.contentWindow) {
        throw new Error("Could not get frame's window");
      }

      const root =
        this.sheetMusicView.contentWindow.document.getElementById("root");

      if (!root) {
        throw new Error("Could not get sheet music view root!");
      }

      // A successful compile yields at least one non-empty SVG page; an empty
      // result means LilyPond produced logs but no output (e.g. a syntax
      // error), which we treat as an error state below and must not count as a
      // render.
      const hasOutput = files.length > 0 && files[0].trim() !== "";

      // If we've gotten into an error state, keep the existing height
      // so that we don't rescroll on update.
      root.style.minHeight = hasOutput ? "0" : `${root.scrollHeight}px`;

      // dompurify v3 preserves the <style>{ tspan { white-space: pre; } }</style>
      // block LilyPond 2.26+ emits (the CDATA wrapper is dropped, but the CSS
      // rule survives and still applies), so multi-space text/lyrics keep their
      // spacing. ALLOW_UNKNOWN_PROTOCOLS keeps LilyPond's textedit: links.
      // ADD_TAGS admits <use> so LilyPond glyph references survive, and
      // ADD_ATTR passes pointer-events through for interaction. A module-level
      // uponSanitizeAttribute hook strips non-fragment href/xlink:href on use.
      // A per-call hook prefixes every id and fragment reference so multiple
      // score previews in the same document don't collide, and pages within a
      // multi-page score don't clobber each other's glyph/clip/gradient IDs.
      // See src/Preview.sanitize.test.ts for regression coverage.
      root.innerHTML = files
        .map((page, i) =>
          sanitizeSvg(
            page,
            `p${crypto.randomUUID().replace(/-/g, "")}-pg${i}-`,
          ),
        )
        .join("");

      if (hasOutput) {
        track(`render/${version}`);
      }
      if (hasOutput && (warnings > 0 || errors > 0)) {
        // success-with-warnings / success-with-errors: the score engraved,
        // but LilyPond emitted diagnostics. Surface a one-line summary at the
        // top of the logs so the caller can see it wasn't a clean render.
        const parts: string[] = [];
        if (warnings > 0) parts.push(`${warnings} warning(s)`);
        if (errors > 0) parts.push(`${errors} error(s)`);
        this.props.onLogsObtained(
          `[rendered with ${parts.join(", ")}]\n${logs}`,
          version,
        );
      } else {
        this.props.onLogsObtained(logs, version);
      }
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
        void this.fetchNewPreview();
      }

      return;
    } catch (err: any) {
      const errMsg =
        (err &&
          err.error &&
          typeof err.error.message === "string" &&
          err.error.message) ||
        "unknown error";
      this.props.onLogsObtained(errMsg, version);
      this.setState({
        error: errMsg,
        pendingPreviews: this.state.pendingPreviews - 1,
        previewAlreadyDirty: true,
      });
    }
  }, DEBOUNCE_REFERSH_TIMEOUT);

  private handleIFrameLoaded = (): void => {
    if (this.sheetMusicView && this.sheetMusicView.contentWindow) {
      const body: HTMLElement = this.sheetMusicView.contentWindow.document.body;
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
            const [line, startColumn, endColumn] =
              pathAndLocation[1].split(":");
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
}
