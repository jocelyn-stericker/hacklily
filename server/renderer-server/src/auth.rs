/**
 * @license
 * This file is part of Hacklily, a web-based LilyPond editor.
 * Copyright (C) 2017 - present Jocelyn Stericker <jocelyn@nettek.ca>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

// GitHub OAuth flow for the coordinator, porting the responsibilities
// previously held by the former Qt `HacklilyServer` (removed in
// `server/ws-server/`, now retired):
//
//   * `signIn` — exchange the temporary `code` for an access token at
//     `https://github.com/login/oauth/access_token`, then fetch the
//     user's profile from `https://api.github.com/user` and assemble
//     the `Auth` object returned to the frontend (`src/auth.ts`).
//   * `signOut` — revoke the access token via `DELETE
//     https://api.github.com/applications/<client_id>/token` using HTTP
//     Basic auth with the OAuth app credentials.
//
// The `Auth` shape returned by `sign_in` matches `src/auth.ts`'s `Auth`,
// so the frontend's `checkLogin` round-trips unchanged.
use async_trait::async_trait;
use log::warn;
use serde::{Deserialize, Serialize};

use crate::jsonrpc::ErrorObject;

const TOKEN_ENDPOINT: &str = "https://github.com/login/oauth/access_token";
const USER_ENDPOINT: &str = "https://api.github.com/user";
const REVOKE_ENDPOINT: &str = "https://api.github.com/applications";

/// The repo each user's sheet music is saved to (`<username>/sheet-music`).
/// Mirrors the legacy Qt `_sendUserInfo` and `src/auth.ts`/`src/gitfs.tsx`.
const DEFAULT_REPO_SUFFIX: &str = "sheet-music";

/// Application-level auth error surfaced back to the frontend as a
/// JSON-RPC error with `code = ERROR_GITHUB` (3). Carries the GitHub
/// response body when available so the frontend can show it.
#[derive(Debug, Clone)]
pub struct AuthError {
    pub message: String,
    pub github_response: Option<serde_json::Value>,
}

impl AuthError {
    pub fn new(message: impl Into<String>) -> Self {
        AuthError {
            message: message.into(),
            github_response: None,
        }
    }

    pub fn with_response(message: impl Into<String>, response: serde_json::Value) -> Self {
        AuthError {
            message: message.into(),
            github_response: Some(response),
        }
    }

    /// Convert into the JSON-RPC error object, preserving the GitHub
    /// response in the `data` field so the frontend can display it.
    pub fn into_error_object(self) -> ErrorObject {
        ErrorObject {
            code: crate::jsonrpc::ERROR_GITHUB,
            message: self.message,
            data: self.github_response,
        }
    }
}

/// The user identity returned to the frontend on `signIn`. Matches
/// `Auth` in `src/auth.ts` (the `repoDetails` field is fetched lazily
/// by the frontend via `gitfs.getOrCreateRepo`, so we don't include it).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Auth {
    #[serde(rename = "accessToken")]
    pub access_token: String,
    pub email: String,
    pub name: String,
    pub username: String,
    pub repo: String,
}

/// Body of the token-exchange POST. Mirrors the legacy Qt `queryData`.
#[derive(Debug, Serialize)]
struct TokenExchangeParams<'a> {
    state: &'a str,
    client_id: &'a str,
    client_secret: &'a str,
    code: &'a str,
}

/// Response from `POST /login/oauth/access_token` (Accept: application/json).
#[derive(Debug, Deserialize)]
struct TokenExchangeResponse {
    access_token: Option<String>,
    #[serde(default)]
    error: Option<String>,
    #[serde(default)]
    error_description: Option<String>,
}

/// Subset of `GET /user` we read. `login` is required (it becomes the
/// repo owner). `name`/`email` may be null/absent and are substituted
/// below, mirroring the Qt fallbacks.
#[derive(Debug, Clone, Deserialize)]
pub struct UserResponse {
    login: String,
    #[serde(default)]
    name: Option<String>,
    #[serde(default)]
    email: Option<String>,
}

/// Trait abstracting the three GitHub API calls so `sign_in`/`sign_out`
/// can be unit tested without a network. The production impl
/// (`ReqwestGitHub`) talks to the real endpoints; tests pass a fake.
#[async_trait]
pub trait GitHub: Send + Sync {
    async fn exchange_code(
        &self,
        client_id: &str,
        client_secret: &str,
        code: &str,
        state: &str,
    ) -> Result<String, AuthError>;

    async fn fetch_user(&self, access_token: &str) -> Result<UserResponse, AuthError>;

    async fn revoke_token(
        &self,
        client_id: &str,
        client_secret: &str,
        token: &str,
    ) -> Result<(), AuthError>;
}

/// Run the full `signIn` flow: exchange `code` for an access token,
/// then fetch the user profile and assemble the `Auth` object the
/// frontend expects. Mirrors `HacklilyServer::_handleOAuthReply` +
/// `_handleUserReply` + `_sendUserInfo`.
pub async fn sign_in(
    github: &(impl GitHub + ?Sized),
    client_id: &str,
    client_secret: &str,
    code: &str,
    state: &str,
) -> Result<Auth, AuthError> {
    let access_token = github
        .exchange_code(client_id, client_secret, code, state)
        .await?;

    // The legacy Qt code rejected a token equal to a previously-seen
    // CSRF (a "timing attack" guard keyed by request id). That check
    // is per-session state on the coordinator and lives at the call
    // site, not in this pure helper — `access_token` here is freshly
    // minted by GitHub, and the coordinator's request-id dedup is
    // orthogonal.

    let user = github.fetch_user(&access_token).await?;

    // Fallbacks mirror the Qt `_handleUserReply` exactly.
    let name = user
        .name
        .filter(|n| !n.is_empty())
        .unwrap_or_else(|| user.login.clone());
    let email = user
        .email
        .filter(|e| !e.is_empty())
        .unwrap_or_else(|| "unknown@example.com".to_owned());
    let repo = format!("{}/{}", user.login, DEFAULT_REPO_SUFFIX);

    Ok(Auth {
        access_token,
        email,
        name,
        username: user.login,
        repo,
    })
}

/// Run the `signOut` flow: revoke the token. Mirrors
/// `HacklilyServer::_handleOAuthDelete`.
pub async fn sign_out(
    github: &(impl GitHub + ?Sized),
    client_id: &str,
    client_secret: &str,
    token: &str,
) -> Result<(), AuthError> {
    github.revoke_token(client_id, client_secret, token).await
}

// ---------------------------------------------------------------------------
// Production impl: reqwest against the real GitHub endpoints.
// ---------------------------------------------------------------------------

/// `reqwest`-backed `GitHub`. Cheap to clone (the inner client is an
/// `Arc`) so callers can hand it to per-connection tasks.
#[derive(Clone)]
pub struct ReqwestGitHub {
    client: reqwest::Client,
}

impl ReqwestGitHub {
    pub fn new() -> Result<Self, AuthError> {
        let client = reqwest::Client::builder()
            .user_agent(concat!(
                "hacklily-renderer-server/",
                env!("CARGO_PKG_VERSION")
            ))
            .build()
            .map_err(|e| AuthError::new(format!("could not build HTTP client: {}", e)))?;
        Ok(ReqwestGitHub { client })
    }
}

#[async_trait]
impl GitHub for ReqwestGitHub {
    async fn exchange_code(
        &self,
        client_id: &str,
        client_secret: &str,
        code: &str,
        state: &str,
    ) -> Result<String, AuthError> {
        let params = TokenExchangeParams {
            state,
            client_id,
            client_secret,
            code,
        };
        let resp = self
            .client
            .post(TOKEN_ENDPOINT)
            .header(reqwest::header::ACCEPT, "application/json")
            .form(&params)
            .send()
            .await
            .map_err(|e| AuthError::new(format!("token exchange request failed: {}", e)))?;

        let status = resp.status();
        let body: TokenExchangeResponse = resp
            .json()
            .await
            .map_err(|e| AuthError::new(format!("token exchange body parse failed: {}", e)))?;

        if let Some(tok) = body.access_token {
            return Ok(tok);
        }

        let message = body
            .error_description
            .or(body.error)
            .unwrap_or_else(|| "GitHub Authentication Error".to_owned());
        if !status.is_success() {
            warn!("github token exchange {}: {}", status, message);
        }
        Err(AuthError::new(format!(
            "GitHub Authentication Error: {}",
            message
        )))
    }

    async fn fetch_user(&self, access_token: &str) -> Result<UserResponse, AuthError> {
        let resp = self
            .client
            .get(USER_ENDPOINT)
            .header(reqwest::header::ACCEPT, "application/json")
            .header(
                reqwest::header::AUTHORIZATION,
                format!("token {}", access_token),
            )
            .send()
            .await
            .map_err(|e| AuthError::new(format!("user fetch request failed: {}", e)))?;

        let status = resp.status();
        let json: serde_json::Value = resp
            .json()
            .await
            .map_err(|e| AuthError::new(format!("user fetch body parse failed: {}", e)))?;

        if !status.is_success() || json.get("error").is_some() {
            return Err(AuthError::with_response(
                "GitHub Authentication Error",
                json,
            ));
        }

        let user: UserResponse = serde_json::from_value(json.clone()).map_err(|e| {
            AuthError::with_response(format!("GitHub Authentication Error: {}", e), json)
        })?;

        if user.login.is_empty() {
            return Err(AuthError::new(
                "GitHub Authentication Error: login is required",
            ));
        }
        Ok(user)
    }

    async fn revoke_token(
        &self,
        client_id: &str,
        client_secret: &str,
        token: &str,
    ) -> Result<(), AuthError> {
        let body = serde_json::json!({ "access_token": token });
        let resp = self
            .client
            .delete(format!("{}/{}/token", REVOKE_ENDPOINT, client_id))
            .header(reqwest::header::ACCEPT, "application/json")
            .header(reqwest::header::CONTENT_TYPE, "application/json")
            .basic_auth(client_id, Some(client_secret))
            .body(body.to_string())
            .send()
            .await
            .map_err(|e| AuthError::new(format!("token revoke request failed: {}", e)))?;

        if resp.status().is_success() {
            Ok(())
        } else {
            let status = resp.status();
            warn!("github token revoke {}: failed", status);
            Err(AuthError::new("Could not remove authorization."))
        }
    }
}

// ---------------------------------------------------------------------------
// Tests — exercise sign_in / sign_out against a fake GitHub.
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Mutex;

    #[derive(Clone)]
    struct FakeGitHub {
        token: Result<String, AuthError>,
        user: Result<UserResponse, AuthError>,
    }

    #[async_trait]
    impl GitHub for FakeGitHub {
        async fn exchange_code(
            &self,
            _client_id: &str,
            _client_secret: &str,
            _code: &str,
            _state: &str,
        ) -> Result<String, AuthError> {
            self.token.clone()
        }
        async fn fetch_user(&self, _access_token: &str) -> Result<UserResponse, AuthError> {
            self.user.clone()
        }
        async fn revoke_token(&self, _: &str, _: &str, _: &str) -> Result<(), AuthError> {
            Ok(())
        }
    }

    struct RevokingGitHub {
        revoked: Mutex<Option<String>>,
        fail_revoke: bool,
    }

    #[async_trait]
    impl GitHub for RevokingGitHub {
        async fn exchange_code(
            &self,
            _: &str,
            _: &str,
            _: &str,
            _: &str,
        ) -> Result<String, AuthError> {
            Ok("tok".into())
        }
        async fn fetch_user(&self, _: &str) -> Result<UserResponse, AuthError> {
            Ok(UserResponse {
                login: "alice".into(),
                name: Some("Alice".into()),
                email: Some("alice@example.com".into()),
            })
        }
        async fn revoke_token(&self, _: &str, _: &str, token: &str) -> Result<(), AuthError> {
            if self.fail_revoke {
                return Err(AuthError::new("nope"));
            }
            *self.revoked.lock().unwrap() = Some(token.to_owned());
            Ok(())
        }
    }

    #[tokio::test]
    async fn sign_in_assembles_auth_with_repo() {
        let gh = FakeGitHub {
            token: Ok("abc".into()),
            user: Ok(UserResponse {
                login: "alice".into(),
                name: Some("Alice".into()),
                email: Some("alice@example.com".into()),
            }),
        };
        let auth = sign_in(&gh, "cid", "sec", "code", "state").await.expect("ok");
        assert_eq!(auth.access_token, "abc");
        assert_eq!(auth.username, "alice");
        assert_eq!(auth.name, "Alice");
        assert_eq!(auth.email, "alice@example.com");
        assert_eq!(auth.repo, "alice/sheet-music");
    }

    #[tokio::test]
    async fn sign_in_falls_back_name_to_username_when_missing() {
        let gh = FakeGitHub {
            token: Ok("abc".into()),
            user: Ok(UserResponse {
                login: "alice".into(),
                name: None,
                email: None,
            }),
        };
        let auth = sign_in(&gh, "cid", "sec", "code", "state").await.expect("ok");
        assert_eq!(auth.name, "alice");
        assert_eq!(auth.email, "unknown@example.com");
    }

    #[tokio::test]
    async fn sign_in_falls_back_name_to_username_when_empty() {
        let gh = FakeGitHub {
            token: Ok("abc".into()),
            user: Ok(UserResponse {
                login: "bob".into(),
                name: Some("".into()),
                email: Some("".into()),
            }),
        };
        let auth = sign_in(&gh, "cid", "sec", "code", "state").await.expect("ok");
        assert_eq!(auth.name, "bob");
        assert_eq!(auth.email, "unknown@example.com");
    }

    #[tokio::test]
    async fn sign_in_propagates_token_exchange_error() {
        let gh = FakeGitHub {
            token: Err(AuthError::new("bad_code")),
            user: Ok(UserResponse {
                login: "x".into(),
                name: None,
                email: None,
            }),
        };
        let err = sign_in(&gh, "cid", "sec", "code", "state").await.expect_err("err");
        assert!(err.message.contains("bad_code"));
    }

    #[tokio::test]
    async fn sign_in_propagates_user_fetch_error() {
        let gh = FakeGitHub {
            token: Ok("abc".into()),
            user: Err(AuthError::new("no_user")),
        };
        let err = sign_in(&gh, "cid", "sec", "code", "state").await.expect_err("err");
        assert!(err.message.contains("no_user"));
    }

    #[test]
    fn auth_serializes_to_frontend_shape() {
        let auth = Auth {
            access_token: "tok".into(),
            email: "a@b.c".into(),
            name: "A".into(),
            username: "a".into(),
            repo: "a/sheet-music".into(),
        };
        let v = serde_json::to_value(&auth).expect("serializes");
        assert_eq!(v["accessToken"], "tok");
        assert_eq!(v["email"], "a@b.c");
        assert_eq!(v["name"], "A");
        assert_eq!(v["username"], "a");
        assert_eq!(v["repo"], "a/sheet-music");
        assert_eq!(v.get("repoDetails"), None);
    }

    #[test]
    fn auth_error_carries_github_response_in_data() {
        let err = AuthError::with_response("boom", serde_json::json!({"error": "bad_verification"}));
        let obj = err.into_error_object();
        assert_eq!(obj.code, crate::jsonrpc::ERROR_GITHUB);
        assert_eq!(obj.message, "boom");
        assert_eq!(obj.data.as_ref().unwrap()["error"], "bad_verification");
    }

    #[tokio::test]
    async fn sign_out_records_revoke() {
        let gh = RevokingGitHub {
            revoked: Mutex::new(None),
            fail_revoke: false,
        };
        sign_out(&gh, "cid", "sec", "tok").await.expect("ok");
        assert_eq!(gh.revoked.lock().unwrap().as_deref(), Some("tok"));
    }

    #[tokio::test]
    async fn sign_out_propagates_error() {
        let gh = RevokingGitHub {
            revoked: Mutex::new(None),
            fail_revoke: true,
        };
        let err = sign_out(&gh, "cid", "sec", "tok").await.expect_err("err");
        assert!(err.message.contains("nope"));
    }
}