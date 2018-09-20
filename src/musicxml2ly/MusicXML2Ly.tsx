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

import React from "react";

const INITIAL_WS_COOLOFF: number = 2;
const BACKEND_WS_URL: string | undefined = process.env.REACT_APP_BACKEND_WS_URL;

import RPCClient from "../RPCClient";
import MusicXML2LyModal from "./MusicXML2LyModal";

interface State {
  wsError: boolean;
  reconnectCooloff: number;
  reconnectTimeout: number;
}

export default class App extends React.PureComponent<{}, State> {
  state: State = {
    reconnectCooloff: INITIAL_WS_COOLOFF,
    reconnectTimeout: NaN,
    wsError: false,
  };

  private rpc: RPCClient | null = null;
  private socket: WebSocket | null = null;

  componentWillMount(): void {
    this.connectToWS();
  }

  componentWillUnmount(): void {
    this.disconnectWS();
  }

  render(): JSX.Element {
    const header = <div className="header" />;

    return (
      <div className="App">
        {header}
        {this.rpc && <MusicXML2LyModal onHide={this.onLeave} rpc={this.rpc} />}
        <div className="content" style={{ width: "50%" }}>
          <div className="monaco" />
        </div>
      </div>
    );
  }

  onLeave = (): void => {
    window.location.href = "/";
  };

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
    this.forceUpdate();
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

  private handleWSError = (e: Event): void => {
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
  };

  private handleWSOpen = async (): Promise<void> => {
    if (!this.socket) {
      throw new Error("Socket not opened, but handleWSOpen called.");
    }
    this.rpc = new RPCClient(this.socket);
    this.setState({
      reconnectCooloff: INITIAL_WS_COOLOFF,
    });
    this.forceUpdate();
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
