// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2017-present Jocelyn Stericker <jocelyn@nettek.ca>

import type { RenderResult, SvgRenderer } from "./SvgRenderer";

/**
 * Options for constructing a WasmRenderer.
 */
export interface WasmRendererOptions {
  /**
   * URL of the classic worker script. The worker and its sibling assets
   * (`lilypond-web.js`, `lilypond.wasm`, `lilypond.data`) must be served from
   * the same directory so the worker's `importScripts` and emscripten's
   * `locateFile` resolve. Defaults to `/wasm/lily-worker.js`.
   */
  workerURL?: string;

  /**
   * Per-render deadline in milliseconds. Single-threaded wasm has no
   * preemption, so a runaway render can only be stopped by terminating the
   * worker; on timeout the worker is recycled and a fresh one is booted.
   * Defaults to 60s.
   */
  deadlineMs?: number;

  /**
   * Fired each time the worker becomes ready (after the initial boot and after
   * any respawn following a crash/timeout).
   */
  onReady?: () => void;

  /**
   * Fired when the worker has crashed (or a render timed out) and is being
   * recycled. The in-flight render, if any, has already been rejected.
   */
  onCrash?: (message: string) => void;
}

interface PendingJob {
  id: number;
  resolve: (r: RenderResult) => void;
  reject: (e: unknown) => void;
  timer?: ReturnType<typeof setTimeout>;
}

interface QueuedJob {
  src: string;
  job: PendingJob;
}

/**
 * An `SvgRenderer` backed by lilypond-wasm running in a Web Worker.
 *
 * One LilyPond instance is kept warm in the worker; repeated `renderSvg`
 * calls pay only the engraving cost, not Guile boot. Renders are serialized
 * (the worker reuses a single in-memory filesystem between renders, so
 * concurrent renders would clobber each other). The worker protocol is:
 *
 *   -> {type: "render", id, src}
 *   <- {type: "ready", warmup_ms}          once per boot
 *   <- {type: "log", line}                streamed during a render (ignored
 *                                          here; we commit logs on completion)
 *   <- {type: "result", id, ok, svg, logs, status, ms}
 *
 * On `ok` the `svg` string is wrapped as a one-element `files` array. On
 * failure the rejection is shaped like the JSON-RPC error the server returns
 * (`{error: {message, data: {logs}}}`) so <Preview>'s existing catch path
 * works unchanged.
 */
export default class WasmRenderer implements SvgRenderer {
  readonly capabilities = { midi: false };

  private readonly workerURL: string;
  private readonly deadlineMs: number;
  private readonly onReady?: () => void;
  private readonly onCrash?: (message: string) => void;

  private worker: Worker | null = null;
  private ready = false;
  private readyResolvers: Array<() => void> = [];
  private inFlightJob: PendingJob | null = null;
  private queue: QueuedJob[] = [];
  private nextId = 1;
  private destroyed = false;

  constructor(options: WasmRendererOptions = {}) {
    this.workerURL = options.workerURL ?? "/wasm/lily-worker.js";
    this.deadlineMs = options.deadlineMs ?? 60_000;
    this.onReady = options.onReady;
    this.onCrash = options.onCrash;
    this.spawn();
  }

  renderSvg(
    src: string,
    _version: "stable" | "unstable",
  ): Promise<RenderResult> {
    return new Promise<RenderResult>((resolve, reject) => {
      const job: PendingJob = { id: this.nextId++, resolve, reject };
      this.queue.push({ src, job });
      this.drain();
    });
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;

    if (this.worker) {
      this.worker.removeEventListener("message", this.handleMessage);
      this.worker.removeEventListener("error", this.handleError);
      this.worker.terminate();
      this.worker = null;
    }
    this.ready = false;

    const dead = { error: { message: "renderer destroyed" } };
    if (this.inFlightJob) {
      if (this.inFlightJob.timer) {
        clearTimeout(this.inFlightJob.timer);
      }
      this.inFlightJob.reject(dead);
      this.inFlightJob = null;
    }
    for (const { job } of this.queue) {
      if (job.timer) clearTimeout(job.timer);
      job.reject(dead);
    }
    this.queue = [];
    this.readyResolvers = [];
  }

  // ── internal ───────────────────────────────────────────────

  private spawn(): void {
    if (this.destroyed) {
      return;
    }
    const worker = new Worker(this.workerURL);
    this.worker = worker;
    worker.addEventListener("message", this.handleMessage);
    worker.addEventListener("error", this.handleError);
  }

  private ensureReady(): Promise<void> {
    if (this.ready && this.worker) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      this.readyResolvers.push(resolve);
    });
  }

  private drain(): void {
    if (this.inFlightJob || this.queue.length === 0) {
      return;
    }
    void this.runNext();
  }

  private async runNext(): Promise<void> {
    if (this.destroyed) {
      return;
    }
    await this.ensureReady();
    if (this.destroyed || !this.worker) {
      return;
    }
    const item = this.queue.shift();
    if (!item) {
      return;
    }
    const { src, job } = item;
    this.inFlightJob = job;
    job.timer = setTimeout(() => {
      this.handleCrash(`render timed out after ${this.deadlineMs}ms`);
    }, this.deadlineMs);
    this.worker.postMessage({ type: "render", id: job.id, src });
  }

  private handleMessage = (e: MessageEvent): void => {
    const m: any = e.data;
    if (!m || typeof m.type !== "string") {
      return;
    }
    if (m.type === "ready") {
      if (!this.ready) {
        this.ready = true;
        this.onReady?.();
        const resolvers = this.readyResolvers;
        this.readyResolvers = [];
        for (const r of resolvers) r();
      }
      return;
    }
    if (m.type === "result") {
      this.handleResult(m);
      return;
    }
    // "log" messages are streamed mid-render; we commit logs only on
    // completion (matching the server path), so they're ignored here.
  };

  private handleError = (ev: ErrorEvent): void => {
    this.handleCrash("worker error: " + (ev.message || "unknown"));
  };

  private handleResult(m: any): void {
    const job = this.inFlightJob;
    if (!job || m.id !== job.id) {
      // Result for an unknown/expired id (e.g. after a crash). Ignore.
      return;
    }
    if (job.timer) {
      clearTimeout(job.timer);
    }
    this.inFlightJob = null;
    console.log(m);

    const logs: string = Array.isArray(m.logs) ? m.logs.join("\n") : "";
    if (m.ok && typeof m.svg === "string") {
      job.resolve({ files: [m.svg], logs, midi: undefined });
    } else {
      const status: string =
        typeof m.status === "string" && m.status ? m.status : "render failed";
      // Shape mirrors the server's JSON-RPC error so <Preview>'s catch path
      // (which reads err.error.message) works unchanged.
      job.reject({ error: { message: status, data: { logs } } });
    }
    this.drain();
  }

  private handleCrash(message: string): void {
    if (this.destroyed) {
      return;
    }
    if (this.inFlightJob) {
      if (this.inFlightJob.timer) {
        clearTimeout(this.inFlightJob.timer);
      }
      this.inFlightJob.reject({ error: { message, data: { logs: "" } } });
      this.inFlightJob = null;
    }
    if (this.worker) {
      this.worker.removeEventListener("message", this.handleMessage);
      this.worker.removeEventListener("error", this.handleError);
      this.worker.terminate();
      this.worker = null;
    }
    this.ready = false;
    this.onCrash?.(message);
    // Recycle: boot a fresh worker. Queued jobs' runNext() coroutines are
    // awaiting ensureReady() and will resume once the new worker signals ready.
    this.spawn();
  }
}
