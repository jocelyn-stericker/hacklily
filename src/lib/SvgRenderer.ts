// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2017-present Jocelyn Stericker <jocelyn@nettek.ca>

/**
 * The result of engraving a LilyPond source to SVG.
 *
 * `files` is one string per engraved page. `logs` is the full LilyPond log
 * output for the render. `midi`, when present, is the base64-encoded MIDI
 * produced alongside the SVG; not every renderer can produce it.
 */
export interface RenderResult {
  files: string[];
  logs: string;
  midi?: string;
}

/**
 * What a renderer can do. Today the only implementation is the server-backed
 * one (`RpcSvgRenderer`); a wasm/worker-backed renderer is planned for the
 * `/wasm` route, which engraves in-browser without a server round-trip.
 */
export interface SvgRenderer {
  /**
   * Whether this renderer can also produce MIDI alongside the SVG. The server
   * renderer can; the wasm renderer cannot (yet). Lets consumers decide
   * whether to offer MIDI export/playback.
   */
  readonly capabilities: { midi: boolean };

  /**
   * Engrave `src` to SVG.
   *
   * `version` is the LilyPond version hint ("stable" | "unstable"), derived
   * from the `\version` in the source. Renderers that only ship one LilyPond
   * (e.g. the wasm one) may ignore it.
   */
  renderSvg(src: string, version: "stable" | "unstable"): Promise<RenderResult>;

  /**
   * Release any resources (worker, etc.). Safe to call multiple times.
   */
  destroy(): void;
}
