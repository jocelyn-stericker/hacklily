// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2017-present Jocelyn Stericker <jocelyn@nettek.ca>

// Minimal JSON-RPC 2.0 framing for the coordinator's WebSocket listeners.
//
// The frontend (`src/RPCClient.tsx`) and the worker protocol
// (`command_source/ws_worker_client.rs`) both speak JSON-RPC 2.0. This
// module provides the small typed envelope shared between the frontend
// listener, the worker listener, and the auth module. It keeps `id` as
// a `serde_json::Value` so the same struct accepts the frontend's
// numeric-string ids (see `RPCClient.genID`) and the worker's `Uuid` ids.
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

pub const JSONRPC_VERSION: &str = "2.0";

// Custom error codes carried over from the legacy Qt coordinator
// (the former Qt `HacklilyServer`, now retired). The frontend treats these
// generically, so preserving them keeps wire compatibility.
pub const ERROR_JSON_PARSE: i64 = 1;
pub const ERROR_INTERNAL: i64 = 2;
pub const ERROR_GITHUB: i64 = 3;

// Standard JSON-RPC 2.0 error codes (used only for protocol-level
// framing errors, not application errors).
pub const STDERR_PARSE_ERROR: i64 = -32700;
pub const STDERR_INVALID_REQUEST: i64 = -32600;
pub const STDERR_METHOD_NOT_FOUND: i64 = -32601;
pub const STDERR_INVALID_PARAMS: i64 = -32602;

/// Method names handled by the coordinator. These match the strings sent
/// by `src/RPCClient.tsx` and `command_source/ws_worker_client.rs`.
pub mod method {
    pub const PING: &str = "ping";
    pub const RENDER: &str = "render";
    pub const SIGN_IN: &str = "signIn";
    pub const SIGN_OUT: &str = "signOut";
    pub const NOTIFY_SAVED: &str = "notifySaved";
    pub const GET_STATUS: &str = "get_status";
    /// Worker registration, sent by a freshly connected `ws-worker`.
    pub const I_HAZ_COMPUTES: &str = "i_haz_computes";
}

/// Default `params` when a request omits the field (the frontend always
/// sends `{}`, but the worker handshake can omit it).
fn default_params() -> Value {
    json!({})
}

/// A JSON-RPC 2.0 request object.
///
/// `id` is kept as a `serde_json::Value` because the protocol permits
/// string, number, or null, and the codebase mixes all three (the
/// frontend uses numeric strings, workers use `Uuid`, the worker
/// handshake in the legacy Qt server used null).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Request {
    pub jsonrpc: String,
    #[serde(default = "default_null")]
    pub id: Value,
    pub method: String,
    #[serde(default = "default_params")]
    pub params: Value,
}

fn default_null() -> Value {
    Value::Null
}

impl std::str::FromStr for Request {
    type Err = Box<Response>;
    /// Parse a text frame into a typed request. Returns the JSON-RPC
    /// parse-error response that should be sent back if parsing fails,
    /// matching the legacy Qt behaviour in `_handleTextMessageReceived`.
    /// The error is boxed to keep the `Err` variant small (the `Response`
    /// carries `serde_json::Value`s).
    fn from_str(text: &str) -> Result<Self, Self::Err> {
        match serde_json::from_str::<Self>(text) {
            Ok(req) if req.jsonrpc == JSONRPC_VERSION => Ok(req),
            Ok(_) => Err(Box::new(Response::error(
                Value::Null,
                STDERR_INVALID_REQUEST,
                "jsonrpc must be \"2.0\"",
            ))),
            Err(err) => Err(Box::new(Response::error(
                Value::Null,
                STDERR_PARSE_ERROR,
                &err.to_string(),
            ))),
        }
    }
}

/// A JSON-RPC 2.0 error object.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorObject {
    pub code: i64,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<Value>,
}

/// A JSON-RPC 2.0 response object. Exactly one of `result`/`error` is
/// `Some` on the wire; `success`/`error` enforce this.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Response {
    pub jsonrpc: String,
    #[serde(default = "default_null")]
    pub id: Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub result: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<ErrorObject>,
}

impl Response {
    pub fn success(id: Value, result: Value) -> Self {
        Response {
            jsonrpc: JSONRPC_VERSION.to_owned(),
            id,
            result: Some(result),
            error: None,
        }
    }

    pub fn error(id: Value, code: i64, message: &str) -> Self {
        Response {
            jsonrpc: JSONRPC_VERSION.to_owned(),
            id,
            result: None,
            error: Some(ErrorObject {
                code,
                message: message.to_owned(),
                data: None,
            }),
        }
    }

    /// Serialize to a JSON string for sending over the wire. Named
    /// `serialize` (rather than `to_string`) to avoid clippy's
    /// `inherent_to_string` lint recommending `Display`.
    pub fn serialize(&self) -> String {
        serde_json::to_string(self).expect("JSON-RPC response is always serializable")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_frontend_request_with_string_id() {
        let raw = r#"{"jsonrpc":"2.0","id":"42","method":"render","params":{"backend":"svg","src":"c4"}}"#;
        let req = raw.parse::<Request>().expect("parses");
        assert_eq!(req.id, json!("42"));
        assert_eq!(req.method, "render");
        assert_eq!(req.params["backend"], "svg");
        assert_eq!(req.params["src"], "c4");
    }

    #[test]
    fn parses_worker_handshake_with_null_id() {
        let raw =
            r#"{"jsonrpc":"2.0","id":null,"method":"i_haz_computes","params":{"max_jobs":4}}"#;
        let req = raw.parse::<Request>().expect("parses");
        assert!(req.id.is_null());
        assert_eq!(req.params["max_jobs"], 4);
    }

    /// Regression: the `ws-worker` handshake is produced by
    /// `command_source/ws_worker_client.rs` as a JSON-RPC 2.0 request
    /// whose `id` is a Uuid (serialized as a string). An earlier
    /// version of the worker sent the handshake *without* a `jsonrpc`
    /// field, which `Request::from_str` rejected — silently breaking
    /// every worker connection. This test pins the exact wire shape.
    #[test]
    fn parses_real_worker_handshake_with_uuid_string_id() {
        let raw = r#"{"jsonrpc":"2.0","id":"7e4f1c8e-9d3a-4f2b-8a1c-2e5d6f7a8b9c","method":"i_haz_computes","params":{"max_jobs":4}}"#;
        let req = raw.parse::<Request>().expect("parses");
        assert_eq!(req.method, "i_haz_computes");
        assert_eq!(req.params["max_jobs"], 4);
        assert!(req.id.is_string());
    }

    /// Regression companion: a handshake missing `jsonrpc` (the old,
    /// broken worker wire format) must be rejected, not silently
    /// accepted as a worker.
    #[test]
    fn rejects_handshake_without_jsonrpc_field() {
        let raw = r#"{"method":"i_haz_computes","id":"7e4f1c8e-9d3a-4f2b-8a1c-2e5d6f7a8b9c","params":{"max_jobs":4}}"#;
        assert!(raw.parse::<Request>().is_err());
    }

    #[test]
    fn parses_request_with_omitted_params() {
        let raw = r#"{"jsonrpc":"2.0","id":"7","method":"ping"}"#;
        let req = raw.parse::<Request>().expect("parses");
        assert_eq!(req.params, json!({}));
    }

    #[test]
    fn rejects_bad_jsonrpc_version() {
        let raw = r#"{"jsonrpc":"1.0","id":"1","method":"ping"}"#;
        let err = raw.parse::<Request>().expect_err("rejects");
        assert_eq!(err.error.expect("error").code, STDERR_INVALID_REQUEST);
        // The framing error has a null id per spec.
        assert!(err.id.is_null());
    }

    #[test]
    fn rejects_malformed_json() {
        let raw = "{not json";
        let err = raw.parse::<Request>().expect_err("rejects");
        assert_eq!(err.error.expect("error").code, STDERR_PARSE_ERROR);
    }

    #[test]
    fn success_response_serializes_without_error_field() {
        let resp = Response::success(json!("9"), json!({"pong": true}));
        let s = resp.serialize();
        assert!(s.contains("\"result\""));
        assert!(!s.contains("\"error\""));
        assert!(s.contains("\"id\":\"9\""));
    }

    #[test]
    fn error_response_serializes_without_result_field() {
        let resp = Response::error(json!("9"), ERROR_GITHUB, "bad");
        let s = resp.serialize();
        assert!(s.contains("\"error\""));
        assert!(!s.contains("\"result\""));
        assert_eq!(resp.error.expect("error").code, ERROR_GITHUB);
    }

    #[test]
    fn round_trips_response_through_serde() {
        let resp = Response::success(json!("1"), json!({"ok": true}));
        let s = resp.serialize();
        let back: Response = serde_json::from_str(&s).expect("round trips");
        assert_eq!(back.id, json!("1"));
        assert_eq!(back.result.expect("result")["ok"], true);
    }
}
