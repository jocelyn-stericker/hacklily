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

import { css } from 'aphrodite';
import React from 'react';
import * as ReactModal from 'react-modal';

import preventDefault from './util/preventDefault';

import { GITHUB_STYLE, MODAL_STYLE } from './styles';

const CLIENT_ID: string | undefined = process.env.REACT_APP_GITHUB_CLIENT_ID;
const SCOPE: string = 'repo';
function getOauthRedirect(csrf: string): string {
  return (
   'https://github.com/login/oauth/authorize' +
   `?client_id=${CLIENT_ID}&scope=${SCOPE}&state=${csrf}`
  );
}

export interface Auth {
  accessToken: string;
  email: string;
  name: string;
  repo: string;
  username: string;
}

interface ConnectToGitHubProps {
  csrf: string;
  connectToGitHubReason: string | null;
  onHide(): void;
  setCSRF(csrf: string): void;
}

export default class ConnectToGitHub extends React.PureComponent<ConnectToGitHubProps, void> {
  render(): JSX.Element {
    const { csrf, onHide, connectToGitHubReason } = this.props;

    if (!CLIENT_ID) {
      return (
        <ReactModal
          isOpen={true}
          onRequestClose={onHide}
          className={css(MODAL_STYLE.modal)}
          contentLabel="Sign in"
          overlayClassName={css(MODAL_STYLE.overlay)}
        >
          <p>
            GitHub integration is not enabled in this copy of Hacklily since the{' '}
            <code>REACT_APP_GITHUB_CLIENT_ID</code> environment variable was not set
            when bundling the application.
          </p>
        </ReactModal>
      );
    }

    const explanation: React.ReactNode = (
      <span>
        <strong>
          <i className="fa fa-info-circle" aria-hidden="true" />{' '}
          {connectToGitHubReason || 'Sign In or Create an Account'}
        </strong>
      </span>
    );

    return (
      <ReactModal
        isOpen={true}
        onRequestClose={onHide}
        className={css(MODAL_STYLE.modal)}
        contentLabel="Sign in"
        overlayClassName={css(MODAL_STYLE.overlay)}
      >
        <div>
          <div className={css(MODAL_STYLE.modalHeader)}>
            {explanation}
            <a
              href="#"
              className={css(MODAL_STYLE.closeButton)}
              aria-label="Back to song"
              onClick={preventDefault(onHide)}
            >
              <i className="fa-close fa" aria-hidden={true} />
            </a>
          </div>
          <div className={css(MODAL_STYLE.modalBody)}>
            <p className={css(MODAL_STYLE.signInPrivacy)}>
              Songs you save will be hosted <strong>publically</strong> at{' '}
              <code className={css(MODAL_STYLE.shareURL)}>
                https://hacklily.github.io/u/&lt;your-github-username&gt;
              </code>
            </p>
            <p className={css(MODAL_STYLE.login)}>
              <a href={getOauthRedirect(csrf)}>
                <button className={css(GITHUB_STYLE.btnGithub)}>
                  Continue with GitHub
                </button>
              </a>
            </p>
            <p className={css(MODAL_STYLE.license)}>
              Only save songs you can and want to share. See the{' '}
              <a href="privacy-statement.html">
                privacy statement
              </a>.
            </p>
          </div>
        </div>
      </ReactModal>
    );
  }

  componentWillMount(): void {
    const randomContainer: Uint32Array = new Uint32Array(1);
    crypto.getRandomValues(randomContainer);
    const csrf: string = localStorage.csrf = randomContainer[0].toString();

    this.props.setCSRF(csrf);
  }
}

export function revokeGitHubAuth(ws: WebSocket, token: string): void {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    throw new Error('Invariant violation: not connected to backend!');
  }
  ws.send(JSON.stringify({
    jsonrpc: '2.0',
    method: 'signOut',
    id: 'signOut',
    params: {
      token,
    },
  }));
}

export async function checkLogin(
    ws: WebSocket,
    code: string | undefined,
    state: string | undefined,
    csrf: string,
): Promise<void> {

  if (!ws || ws.readyState !== WebSocket.OPEN) {
    throw new Error('Invariant violation: not connected to backend!');
  }
  if (code && state) {
    if (csrf !== state) {
      console.warn('Invalid csrf.');
      alert('Something went wrong. Could not log you in.');
      return;
    }
    ws.send(JSON.stringify({
      jsonrpc: '2.0',
      method: 'oauth',
      id: `oauthExchange_${state}`,
      params: {
        oauth: code,
        state,
      },
    }));
  }
}

export function checkAuth(e: MessageEvent, csrf: string): Auth | null {
  const contents: {id: string, result: Auth | {error: object | string}} =
    JSON.parse(e.data.toString());
  if (contents.id === `oauthExchange_${csrf}`) {
    const authOrError: Auth | {error: object | string} = contents.result;
    if ('error' in authOrError) {
      throw new Error('Could not log you in.');
    }
    const auth: Auth = authOrError as Auth;
    if (!auth.accessToken || !auth.email || !auth.name || !auth.repo || !auth.username) {
      throw new Error('Could not log you in.');
    }
    return auth;
  }
  return null;
}

export function parseAuth(auth: string | undefined): Auth | null {
  if (!auth) {
    return null;
  }
  try {
    const parsedAuth: Auth = JSON.parse(auth);
    if (parsedAuth && parsedAuth.accessToken && parsedAuth.email &&
        parsedAuth.name && parsedAuth.repo && parsedAuth.username) {
      return parsedAuth;
    }
    return null;
  } catch (err) {
    return null;
  }
}
