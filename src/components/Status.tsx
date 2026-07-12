// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2017-present Jocelyn Stericker <jocelyn@nettek.ca>

import React from "react";

import type { Status as ServerStatus } from "#/lib/RPCClient";
import RPCClient from "#/lib/RPCClient";

const INITIAL_WS_COOLOFF = 1;
const BACKEND_WS_URL: string | undefined = process.env.REACT_APP_BACKEND_WS_URL;

interface State {
  reconnectCooloff: number;
  reconnectTimeout: number;
  status: ServerStatus | null;
  wsError: boolean;
}

/**
 * Renders <app>/status.html
 */
export default class Status extends React.Component<{}, State> {
  state: State = {
    reconnectCooloff: INITIAL_WS_COOLOFF,
    reconnectTimeout: NaN,
    status: null,
    wsError: false,
  };

  private rpc: RPCClient | null = null;
  private socket: WebSocket | null = null;
  private statusTimer: number | null = null;

  componentDidMount(): void {
    this.connectToWS();
  }

  render(): JSX.Element {
    if (this.state.wsError) {
      return (
        <div>
          Could not connect to server. ({this.state.reconnectTimeout || 0})
        </div>
      );
    }

    if (!this.socket || this.socket.readyState === WebSocket.CONNECTING) {
      return <div>Connecting...</div>;
    }

    const { status } = this.state;

    if (!status) {
      return <div>No status returned.</div>;
    }

    return (
      <div>
        <h1>Status</h1>
        <pre>{JSON.stringify(status, null, 2)}</pre>
      </div>
    );
  }

  private connectToWS(): void {
    if (!BACKEND_WS_URL) {
      this.setState({
        wsError: true,
      });

      return;
    }
    this.socket = new WebSocket(BACKEND_WS_URL);

    this.socket.addEventListener("open", this.handleWSOpen);
    this.socket.addEventListener("error", this.handleWSError);
    this.socket.addEventListener("close", this.handleWSError);
  }

  private disconnectWS(): void {
    if (this.socket) {
      this.socket.removeEventListener("open", this.handleWSOpen);
      this.socket.removeEventListener("error", this.handleWSError);
      this.socket.removeEventListener("close", this.handleWSError);
      this.socket.close();
      this.socket = null;
      if (this.rpc) {
        this.rpc.destroy();
        this.rpc = null;
      }
    }
  }

  private handleGetStatusTimeout = async (): Promise<void> => {
    if (!this.rpc) {
      return;
    }

    const status: ServerStatus = (await this.rpc.call("get_status", {})).result;
    this.setState({
      reconnectCooloff: INITIAL_WS_COOLOFF,
      status,
      wsError: false,
    });
  };

  private handleWSError = (_e: Event): void => {
    if (!this.socket) {
      return;
    }

    this.disconnectWS();
    this.setState({
      reconnectCooloff: this.state.reconnectCooloff * 2,
      reconnectTimeout: this.state.reconnectCooloff,
      wsError: true,
    });
    setTimeout(this.wsReconnectTick, 1000);
    if (this.statusTimer) {
      clearInterval(this.statusTimer);
    }
  };

  private handleWSOpen = async (): Promise<void> => {
    if (!this.socket) {
      throw new Error("Socket not opened, but handleWSOpen called.");
    }
    this.rpc = new RPCClient(this.socket);

    this.statusTimer = window.setInterval(this.handleGetStatusTimeout, 1000);
    void this.handleGetStatusTimeout();
  };

  private wsReconnectTick = (): void => {
    const secondsRemaining: number = this.state.reconnectTimeout - 1;
    if (secondsRemaining > 0) {
      this.setState({
        reconnectTimeout: secondsRemaining,
      });
      setTimeout(this.wsReconnectTick, 1000);
    } else {
      this.setState({
        reconnectTimeout: NaN,
      });
      this.connectToWS();
    }
  };
}
