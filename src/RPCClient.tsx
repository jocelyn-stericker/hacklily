/**
 * @license
 * This file is part of Hacklily, a web-based LilyPond editor.
 * Copyright (C) 2017 - present Jocelyn Stericker <jocelyn@nettek.ca>
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

import { Auth } from "./auth";

const PING_INTERVAL: number = 2500;

// -------------------------------------------------------------------------
// JSON-RPC 2.0 definitions
// -------------------------------------------------------------------------

/**
 * A rpc call is represented by sending a Request object to a Server.
 *
 * http://www.jsonrpc.org/specification#request_object
 */
export interface BaseRPCRequest {
  /**
   * An identifier established by the Client that MUST contain a String, Number, or NULL value
   * if included. If it is not included it is assumed to be a notification. The value SHOULD
   * normally not be Null [1] and Numbers SHOULD NOT contain fractional parts [2]
   *
   * The Server MUST reply with the same value in the Response object if included. This member
   * is used to correlate the context between the two objects.
   *
   * Note: will be set by RPC if undefined beforehand.
   */
  id?: string | number | null;

  /**
   * A String specifying the version of the JSON-RPC protocol. MUST be exactly "2.0".
   */
  jsonrpc: "2.0";

  /**
   * A String containing the name of the method to be invoked. Method names that begin with
   * the word rpc followed by a period character (U+002E or ASCII 46) are reserved for rpc-internal
   * methods and extensions and MUST NOT be used for anything else.
   */
  method: string;

  /**
   * A Structured value that holds the parameter values to be used during the invocation of the
   * method. This member MAY be omitted.
   */
  params: {} | undefined;
}

/**
 * When a rpc call encounters an error, the Response Object MUST contain the error member with
 * a value that is a Object with the following members:
 *
 * http://www.jsonrpc.org/specification#error_object
 */
export interface RPCError {
  /**
   * A Number that indicates the error type that occurred.
   * This MUST be an integer.
   */
  code: number;

  /**
   * A Primitive or Structured value that contains additional information about the error.
   * This may be omitted.
   * The value of this member is defined by the Server (e.g. detailed error information,
   * nested errors etc.).
   */
  data?: {};

  /**
   * A String providing a short description of the error.
   * The message SHOULD be limited to a concise single sentence.
   */
  message: string;
}

/**
 * When a rpc call is made, the Server MUST reply with a Response, except for in the case
 * of Notifications.
 *
 * http://www.jsonrpc.org/specification#response_object
 */
export interface BaseRPCResponse {
  /**
   * This member is REQUIRED on error.
   * This member MUST NOT exist if there was no error triggered during invocation.
   * The value for this member MUST be an Object as defined in section 5.1.
   */
  error?: RPCError;

  /**
   * This member is REQUIRED.
   * It MUST be the same as the value of the id member in the Request Object.
   * If there was an error in detecting the id in the Request object
   * (e.g. Parse error/Invalid Request), it MUST be Null.
   */
  id: string | number | null;

  /**
   * A String specifying the version of the JSON-RPC protocol. MUST be exactly "2.0".
   */
  jsonrpc: "2.0";

  /**
   * This member is REQUIRED on success.
   * This member MUST NOT exist if there was an error invoking the method.
   * The value of this member is determined by the method invoked on the Server.
   */
  result?: {} | string | number | null;
}

// -------------------------------------------------------------------------
// "render"
// -------------------------------------------------------------------------

export interface RenderParams {
  backend: "svg" | "pdf" | "musicxml2ly";
  src: string;
  version?: "stable" | "unstable";
}

export interface RenderResponse extends BaseRPCResponse {
  error: {
    code: number;
    data?: {
      logs?: string;
    };
    message: string;
  };
  result: {
    err: string;
    files: string[];
    logs: string;
    midi?: string;
  };
}

// -------------------------------------------------------------------------
// "signIn"
// -------------------------------------------------------------------------

export interface SignInParams {
  oauth: string;
  state: string;
}

export interface SignInResponse extends BaseRPCResponse {
  result: Auth;
}

// -------------------------------------------------------------------------
// "signOut"
// -------------------------------------------------------------------------

export interface SignOutParams {
  token: string;
}

// -------------------------------------------------------------------------
// "status"
// -------------------------------------------------------------------------

export interface Status {
  alive: boolean;
  backlog: number;
  busy_worker_count: number;
  free_worker_count: number;
  local_worker_count: number;
  remote_worker_count: number;
  startup_time: string;
  total_worker_count: number;
  uptime_secs: number;
}

export interface StatusResponse extends BaseRPCResponse {
  result: Status;
}

// -------------------------------------------------------------------------
// Method map
// -------------------------------------------------------------------------

interface RPCRequestParamsMap {
  // To type check values
  [key: string]: {};

  get_status: {};
  ping: {};
  render: RenderParams;
  signIn: SignInParams;
  signOut: SignOutParams;
}

interface RPCResponseMap {
  // To type check values
  [key: string]: BaseRPCResponse;

  get_status: StatusResponse;
  ping: BaseRPCResponse;
  render: RenderResponse;
  signIn: SignInResponse;
  signOut: BaseRPCResponse;
}

// -------------------------------------------------------------------------
// RPCClient Implementation
// -------------------------------------------------------------------------

/**
 * This is a wrapper around a WebSocket that calls the Hacklily backend.
 * It implements a JSONRPC 2.0 session.
 */
export default class RPCClient {
  private pingInterval: number;
  private rejectors?: {
    [key: string]: (response: BaseRPCResponse) => void;
  } = {};
  private resolvers?: {
    [key: string]: (response: BaseRPCResponse) => void;
  } = {};
  private socket?: WebSocket;

  constructor(socket: WebSocket) {
    this.socket = socket;
    this.socket.addEventListener("message", this.handleWSMessage);
    this.pingInterval = window.setInterval(this.ping, PING_INTERVAL);
  }

  call<T extends keyof RPCRequestParamsMap & keyof RPCResponseMap>(
    method: T,
    params: RPCRequestParamsMap[T],
  ): Promise<RPCResponseMap[T]> {
    const id: string = this.genID();
    if (typeof method !== "string") {
      throw new Error(
        `method must be a string, got ${typeof method}, ${method}`,
      );
    }

    if (!this.socket || !this.resolvers || !this.rejectors) {
      throw new Error("Cannot call on destroyed object");
    }

    const request: BaseRPCRequest = {
      id,
      jsonrpc: "2.0",
      method,
      params,
    };

    if (this.socket.readyState !== WebSocket.OPEN) {
      const rejection: BaseRPCResponse = {
        error: {
          code: -32000,
          message: "Network error",
        },
        id,
        jsonrpc: "2.0",
      };

      return Promise.reject(rejection);
    }

    const promise: Promise<BaseRPCResponse> = new Promise<BaseRPCResponse>(
      (
        resolve: (response: BaseRPCResponse) => void,
        reject: (reason: BaseRPCResponse) => void,
      ): void => {
        if (!this.resolvers || !this.rejectors) {
          return;
        }
        this.resolvers[id] = resolve;
        this.rejectors[id] = reject;
      },
    );

    this.socket.send(JSON.stringify(request));

    return promise;
  }

  destroy(): void {
    clearInterval(this.pingInterval);

    if (!this.resolvers || !this.rejectors) {
      return;
    }

    for (const id of Object.keys(this.resolvers)) {
      const response: BaseRPCResponse = {
        error: {
          code: -32000,
          message: "Network error",
        },
        id,
        jsonrpc: "2.0",
      };
      this.rejectors[id](response);
      delete this.resolvers[id];
      delete this.rejectors[id];
    }
    delete this.resolvers;
    delete this.rejectors;
    delete this.socket;
  }

  private genID(): string {
    const randomContainer: Uint32Array = new Uint32Array(1);
    crypto.getRandomValues(randomContainer);

    return randomContainer[0].toString();
  }

  private handleWSMessage = (e: MessageEvent): void => {
    if (!this.socket || !this.resolvers || !this.rejectors) {
      throw new Error("Cannot handle ws message when destroyed");
    }

    const data: BaseRPCResponse = JSON.parse(e.data.toString());
    if (!data.id) {
      throw new Error(`Got reply with no id: ${e.data}`);
    }
    if (!(data.id in this.resolvers)) {
      // This is not one of our events.
      return;
    }
    try {
      if (data.error) {
        this.rejectors[data.id](data);
      } else {
        this.resolvers[data.id](data);
      }
    } finally {
      delete this.rejectors[data.id];
      delete this.resolvers[data.id];
    }
  };

  private ping = async (): Promise<void> => {
    await this.call("ping", {});
  };
}
