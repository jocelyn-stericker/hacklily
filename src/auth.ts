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

import RPCClient, { SignInResponse } from "./RPCClient";

export interface Repo {
  ["private"]: boolean;

  created_at: string;
  description: string;
  fork: false;
  forks_count: number;
  full_name: string;
  has_pages: boolean;
  name: string;
  network_count: number;
  project_count: number;
  pushed_at: string;
  stargazers_count: number;
  subscribers_count: number;
  updated_at: string;
  url: string;
}

export interface Auth {
  accessToken: string;
  email: string;
  name: string;
  repo: string;
  repoDetails?: Repo;
  username: string;
}

export const CLIENT_ID: string | undefined =
  process.env.REACT_APP_GITHUB_CLIENT_ID;
const SCOPE: string = "repo";
export function getOauthRedirect(csrf: string): string {
  return (
    "https://github.com/login/oauth/authorize" +
    `?client_id=${CLIENT_ID}&scope=${SCOPE}&state=${csrf}`
  );
}

/**
 * It's good practice when logging out to revoke the OAuth token, I guess.
 */
export async function revokeGitHubAuth(
  rpc: RPCClient,
  token: string,
): Promise<void> {
  try {
    await rpc.call("signOut", {
      token,
    });
  } catch (err) {
    alert(
      "Could not revoke GitHub authorization. " +
        "If you would like, you can manually do this from your GitHub settings.",
    );
  } finally {
    window.location.reload();
  }
}

/**
 * Called by <App /> to continue the OAuth flow.
 */
export async function checkLogin(
  rpc: RPCClient,
  code: string,
  state: string,
  csrf: string,
): Promise<Auth> {
  if (csrf !== state) {
    console.warn("Invalid csrf.");
    throw new Error("Something went wrong. Could not log you in.");
  }
  const response: SignInResponse = await rpc.call("signIn", {
    oauth: code,
    state,
  });

  if (
    !response.result.accessToken ||
    !response.result.email ||
    !response.result.name ||
    !response.result.repo ||
    !response.result.username
  ) {
    throw new Error("Could not log you in.");
  }

  return response.result;
}

/**
 * Deserializes Auth. Used when parsing localStorage.
 */
export function parseAuth(auth: string | undefined): Auth | null {
  if (!auth) {
    return null;
  }
  try {
    const parsedAuth: Auth = JSON.parse(auth);
    if (
      parsedAuth &&
      parsedAuth.accessToken &&
      parsedAuth.email &&
      parsedAuth.name &&
      parsedAuth.repo &&
      parsedAuth.username
    ) {
      return parsedAuth;
    }

    return null;
  } catch (err) {
    return null;
  }
}

export function redirectToLogin(csrf: string): void {
  window.location.href = getOauthRedirect(csrf);
}
