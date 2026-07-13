// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2017-present Jocelyn Stericker <jocelyn@nettek.ca>

import type RPCClient from "./RPCClient";
import type { RenderResult, SvgRenderer } from "./SvgRenderer";

/**
 * An `SvgRenderer` backed by the Hacklily server over the existing JSON-RPC
 * WebSocket.
 *
 * This is a thin adapter: it forwards `renderSvg` to `rpc.call("render", …)`
 * with `backend: "svg"` and unwraps `.result` into `RenderResult`. It owns no
 * state of its own and its `destroy()` is a no-op — the `RPCClient` (and the
 * socket beneath it) are owned by `App`.
 */
export default class RpcSvgRenderer implements SvgRenderer {
  readonly capabilities = { midi: true };

  constructor(private readonly rpc: RPCClient) {}

  async renderSvg(
    src: string,
    version: "stable" | "unstable",
  ): Promise<RenderResult> {
    const response = await this.rpc.call("render", {
      backend: "svg",
      src,
      version,
    });
    return response.result;
  }

  // The RPCClient's lifetime is managed by App; nothing to release here.
  destroy(): void {}
}
