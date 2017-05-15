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

import About from './About';
import ConnectToGitHub, {
  Auth,
  checkLogin,
  revokeGitHubAuth,
} from './ConnectToGitHub';
import Editor from './Editor';
import { cat } from './gitfs';
import Header, { MODE_BOTH, MODE_VIEW, ViewMode } from './Header';
import Menu from './Menu';
import Preview from './Preview';
import Publish, { publish } from './Publish';
import RPCClient from './RPCClient';
import { APP_STYLE } from './styles';

function last<T>(t: T[]): T {
  return t[t.length - 1];
}

const INITIAL_WS_COOLOFF: number = 2;
const BACKEND_WS_URL: string | undefined = process.env.REACT_APP_BACKEND_WS_URL;

// NOTE: When you add a key here, also add it to QUERY_PROP_KEYS below.
export interface QueryProps {
  /**
   * The song being edited, with the following format:
   *
   *   `${org}/${repo}/${song}.ly`
   *
   * If it is undefined, Hacklily will act as a sandbox.
   */
  edit?: string;

  /**
   * When logging in from GitHub, code is the temporary code that will be exchanged via
   * the backend for an access token.
   *
   * See https://developer.github.com/v3/oauth/
   */
  code?: string;

  /**
   * When logging in from GitHub, this is the CSRF, generated in ConnectToGitHub.
   *
   * See https://developer.github.com/v3/oauth/.
   */
  state?: string;
}

export const QUERY_PROP_KEYS: (keyof QueryProps)[] = [
  'edit',
  'code',
  'state',
];

interface AppProps extends QueryProps {
  dirtySongs: {[key: string]: string};
  auth: Auth | null;
  csrf: string;
  setQuery<K extends keyof QueryProps>(updates: Pick<QueryProps, K>, replaceState?: boolean): void;
  editSong(song: string, src: string): void;
  markSongClean(song: string): void;
  setAuth(auth: Auth | null): void;
  setCSRF(csrf: string): void;
}

interface AppState {
  cleanSongs: {[key: string]: string};
  connectToGitHubReason: string | null;
  defaultSelection: monaco.ISelection | null;
  error: string | null;
  help: boolean;
  menu: boolean;
  logs: string | null;
  mode: ViewMode;
  pendingPreviews: number;
  previewAlreadyDirty: boolean;
  publish: boolean;
  login: boolean;
  wsError: boolean;
  reconnectTimeout: number;
  reconnectCooloff: number;
}

export default class App extends React.PureComponent<AppProps, AppState> {
  state: AppState = {
    cleanSongs: {
      null: '{ d4 }',
    },
    connectToGitHubReason: null,
    defaultSelection: null,
    error: null,
    help: false,
    menu: false,
    logs: '',
    mode: MODE_BOTH,
    pendingPreviews: 0,
    previewAlreadyDirty: false,
    publish: false,
    login: false,
    wsError: false,
    reconnectTimeout: NaN,
    reconnectCooloff: INITIAL_WS_COOLOFF,
  };

  private socket: WebSocket | null = null;
  private rpc: RPCClient | null = null;

  render(): JSX.Element {
    const {
      state : {
        logs,
        mode,
        login,
        connectToGitHubReason,
        help,
        menu,
        defaultSelection,
        publish,
      },
      props: {
        auth,
        edit,
        csrf,
        setCSRF,
        dirtySongs,
      },
    } = this;

    const online: boolean = this.isOnline();
    const preview: React.ReactNode = this.preview();
    const code: string | undefined = this.code();

    const connectToGitHubButton: React.ReactNode = login && (
      <ConnectToGitHub
        connectToGitHubReason={connectToGitHubReason}
        onHide={this.handleHideLogin}
        csrf={csrf}
        setCSRF={setCSRF}
      />
    );
    const aboutDialog: React.ReactNode = help && <About onHide={this.handleHideHelp} />;
    const publishDialog: React.ReactNode = publish && auth && code && this.rpc && (
      <Publish
        onHide={this.handleHidePublish}
        auth={auth}
        code={code}
        rpc={this.rpc}
      />
    );
    const menuDialog: React.ReactNode = menu && (
      <Menu
        auth={auth}
        onHide={this.handleHideMenu}
        onShowAbout={this.handleShowHelp}
        onSignIn={this.handleSignIn}
        onSignOut={this.handleSignOut}
        onLoadSong={this.handleLoadSong}
      />
    );

    return (
      <div className="App">
        <Header
          mode={mode}
          online={online}
          loggedIn={auth !== null}
          onModeChanged={this.handleModeChanged}
          onShowMenu={this.handleShowMenu}
          onShowNew={this.handleShowNew}
          onShowPublish={this.handleShowPublish}
          song={edit}
          isDirty={Boolean(edit ? dirtySongs[edit] : dirtySongs['null'])}
        />
        {aboutDialog}
        {menuDialog}
        {connectToGitHubButton}
        {publishDialog}
        <div className="content">
          <Editor
            code={code}
            mode={mode}
            onSetCode={this.handleCodeChanged}
            logs={logs}
            defaultSelection={defaultSelection}
          />
          {preview}
        </div>
      </div>
    );
  }

  componentWillMount(): void {
    this.connectToWS();
    this.fetchSong();
  }

  componentWillUnmount(): void {
    this.disconnectWS();
  }

  componentDidUpdate(prevProps: AppProps): void {
    if (this.props.edit !== prevProps.edit) {
      this.fetchSong();
    }
  }

  private async fetchSong(): Promise<void> {
    const { auth, edit } = this.props;
    if (!auth || edit === 'null' || !edit) {
      return;
    }
    const path: string = last(edit.split('/'));
    const contents: string = await cat(auth.accessToken, auth.repo, path);
    const cleanSongs: {[key: string]: string} = JSON.parse(JSON.stringify(this.state.cleanSongs));
    cleanSongs[edit] = contents;
    this.setState({
      cleanSongs,
    });
  }

  private code(): string | undefined {
    const { dirtySongs, edit } = this.props;
    const { cleanSongs } = this.state;
    const song: string = edit || 'null';
    return dirtySongs[song] || cleanSongs[song];
  }

  private isOnline(): boolean {
    return Boolean(this.rpc);
  }

  private preview(): React.ReactNode {
    const { mode, reconnectTimeout, logs, wsError } = this.state;

    const code: string | undefined = this.code();

    const online: boolean = this.isOnline();
    if (!code) {
      return (
        <div
            className={css(APP_STYLE.sheetMusicView)}
            style={{ width: mode === MODE_BOTH ? '50%' : (mode === MODE_VIEW ? '100%' : '0') }}
        >
          <div className={css(APP_STYLE.sheetMusicError)}>
            Fetching sheet music&hellip;
          </div>
        </div>
      );
    } else if (this.socket) {
      if (online && this.rpc) {
        return (
          <Preview
            code={code}
            mode={mode}
            onLogsObtained={this.handleLogsObtained}
            onSelectionChanged={this.handleSelectionChanged}
            rpc={this.rpc}
            logs={logs}
          />
        );
      } else {
        return (
          <span>
            <div
                className={css(APP_STYLE.sheetMusicView)}
                style={{ width: mode === MODE_BOTH ? '50%' : (mode === MODE_VIEW ? '100%' : '0') }}
            />
            <div className={css(APP_STYLE.pendingPreviewMask)} />
          </span>
        );
      }
    } else if (!BACKEND_WS_URL) {
      return (
        <div
            className={css(APP_STYLE.sheetMusicView)}
            style={{ width: mode === MODE_BOTH ? '50%' : (mode === MODE_VIEW ? '100%' : '0') }}
        >
          <div className={css(APP_STYLE.sheetMusicError)}>
            Could not connect to server because the <code>REACT_APP_BACKEND_WS_URL</code>{' '}
            environment variable was not set during bundling.
          </div>
        </div>
      );
    } else if (wsError) {
      return (
        <div
            className={css(APP_STYLE.sheetMusicView)}
            style={{ width: mode === MODE_BOTH ? '50%' : (mode === MODE_VIEW ? '100%' : '0') }}
        >
          <div className={css(APP_STYLE.sheetMusicError)}>
            <i className="fa fa-exclamation-triangle" aria-hidden={true} />{' '}
            Could not connect to server.<br />
            Trying again in {reconnectTimeout}&hellip;
          </div>
        </div>
      );
    } else {
      throw new Error('Invalid state.');
    }
  }

  private handleModeChanged = (mode: ViewMode): void => {
    this.setState({
      mode,
    });
  }

  private handleCodeChanged = (newValue: string): void => {
    const clean: string = this.state.cleanSongs[this.props.edit || 'null'];
    if (clean === newValue) {
      this.props.markSongClean(this.props.edit || 'null');
    } else {
      this.props.editSong(this.props.edit || 'null', newValue);
    }
  }

  private handleShowMenu = (): void => {
    this.setState({
      menu: true,
      help: false,
    });
  }

  private handleShowHelp = (): void => {
    this.setState({
      help: true,
      menu: false,
    });
  }

  private handleHideHelp = (): void => {
    this.setState({
      help: false,
    });
  }

  private handleHideMenu = (): void => {
    this.setState({
      menu: false,
    });
  }

  private handleShowPublish = (): void => {
    if (!this.props.auth) {
      this.setState({
        login: true,
        connectToGitHubReason: 'Connect to GitHub to share this song',
      });
    } else if (this.props.edit) {
      this.handleUpdate();
    } else {
      this.setState({
        publish: true,
      });
    }
  }

  private handleUpdate = async (): Promise<void> => {
    const code: string | undefined = this.code();
    const { auth, edit } = this.props;
    if (!auth || !edit || !code || !this.rpc) {
      throw new Error('Invariant violation: contract broken');
    }
    const path: string = last(edit.split('/'));

    const ok: boolean = await publish(code, auth, path, this.rpc, true);

    if (ok) {
      const cleanSongs: {[key: string]: string} = JSON.parse(JSON.stringify(this.state.cleanSongs));
      cleanSongs[edit] = code;
      this.setState({
        cleanSongs,
      });
      this.props.markSongClean(edit);
      alert('Saved.');
    }
  }

  private handleHidePublish = (): void => {
    this.setState({
      publish: false,
    });
  }

  private handleShowNew = (): void => {
    if (!this.props.auth) {
      this.setState({
        login: true,
        connectToGitHubReason: 'Connect to GitHub to save this song',
      });
    } else {
      this.props.setQuery({
        edit: undefined,
      });
    }
  }

  private handleSignIn = (): void => {
    this.setState({
      login: true,
      publish: false,
      menu: false,
      connectToGitHubReason: null,
    });
  }

  private handleSignOut = (): void => {
    const { auth } = this.props;

    if (!this.rpc) {
      alert('Cannot sign out because you are not connected to the server.');
      return;
    }

    this.props.setAuth(null);

    if (!auth) {
      throw new Error('Cannot sign out because we are not signed in.');
    }
    const token: string = auth.accessToken;
    revokeGitHubAuth(this.rpc, token);
  }

  private handleHideLogin = (): void => {
    this.setState({
      login: false,
      connectToGitHubReason: null,
    });
  }

  private handleLogsObtained = (logs: string | null): void => {
    if (logs !== this.state.logs) {
      this.setState({
        logs,
      });
    }
  }

  private handleSelectionChanged = (selection: monaco.ISelection | null): void => {
    if (selection !== this.state.defaultSelection) {
      this.setState({
        defaultSelection: selection,
      });
    }
  }

  private connectToWS(): void {
    if (!BACKEND_WS_URL) {
      this.setState({
        wsError: true,
      });
      return;
    }
    this.socket = new WebSocket(BACKEND_WS_URL);

    this.socket.addEventListener('open', this.handleWSOpen);
    this.socket.addEventListener('error', this.handleWSError);
    this.socket.addEventListener('close', this.handleWSError);
    this.forceUpdate();
  }

  private disconnectWS(): void {
    if (this.socket) {
      this.socket.removeEventListener('open', this.handleWSOpen);
      this.socket.removeEventListener('error', this.handleWSError);
      this.socket.removeEventListener('close', this.handleWSError);
      this.socket.close();
      this.socket = null;
      if (this.rpc) {
        this.rpc.destroy();
        this.rpc = null;
      }
    }
  }

  private handleWSOpen = async (): Promise<void> => {
    if (!this.socket) {
      throw new Error('Socket not opened, but handleWSOpen called.');
    }
    this.rpc = new RPCClient(this.socket);
    if (this.props.code && this.props.state) {
      try {
        const auth: Auth = await checkLogin(
          this.rpc,
          this.props.code,
          this.props.state,
          this.props.csrf,
        );
        this.props.setQuery({
          code: undefined,
          state: undefined,
        });
        this.props.setAuth(auth);
      } catch (err) {
        alert(err.message || 'Could not log you in');
      }
    }
    this.setState({
      reconnectCooloff: INITIAL_WS_COOLOFF,
    });
    this.forceUpdate();
  }

  private handleWSError = (e: ErrorEvent): void => {
    if (!this.socket) {
      return;
    }

    this.disconnectWS();
    this.setState({
      wsError: true,
      reconnectTimeout: this.state.reconnectCooloff,
      reconnectCooloff: this.state.reconnectCooloff * 2,
    });
    setTimeout(this.wsReconnectTick, 1000);
  }

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
  }

  private handleLoadSong = (edit: string): void => {
    this.props.setQuery({
      edit,
    });
    this.setState({
      menu: false,
    });
  }
}
