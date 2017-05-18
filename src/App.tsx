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

import Editor from './Editor';
import { cat, FileNotFound } from './gitfs';
import Header, { MODE_BOTH, MODE_VIEW, ViewMode } from './Header';
import Menu from './Menu';
import Modal404 from './Modal404';
import ModalAbout from './ModalAbout';
import ModalConflict from './ModalConflict';
import ModalLocked, { lock, setEditingNotificationHandler } from './ModalLocked';
import ModalLogin, {
  Auth,
  checkLogin,
  revokeGitHubAuth,
} from './ModalLogin';
import ModalPublish, { publish, unpublish } from './ModalPublish';
import ModalSaving from './ModalSaving';
import ModalUnsavedChangesInterstitial from './ModalUnsavedChangesInterstitial';
import Preview from './Preview';
import RPCClient from './RPCClient';
import { APP_STYLE } from './styles';

function last<T>(t: T[]): T {
  return t[t.length - 1];
}

const INITIAL_WS_COOLOFF: number = 2;
const BACKEND_WS_URL: string | undefined = process.env.REACT_APP_BACKEND_WS_URL;

/**
 * Properties derived from URL.
 *
 * e.g., https://hacklily.github.io/?edit=hacklily/hacklily-jnetterf/test.ly =>
 *   {
 *     edit: 'hacklily/hacklily-jnetterf/test.ly',
 *   }
 *
 * NOTE: When you add a key here, also add it to QUERY_PROP_KEYS below.
 */
export interface QueryProps {
  /**
   * Truthy if this was redirected from a 404 page.
   */
  '404'?: string;

  /**
   * When logging in from GitHub, code is the temporary code that will be exchanged via
   * the backend for an access token.
   *
   * See also 'state'.
   *
   * See https://developer.github.com/v3/oauth/
   */
  code?: string;

  /**
   * The song being edited, with the following format:
   *
   *   `${org}/${repo}/${song}.ly`
   *
   * If it is undefined, Hacklily will act as a sandbox.
   */
  edit?: string;

  /**
   * When logging in from GitHub, this is the CSRF, generated in ConnectToGitHub.
   *
   * See also 'code'.
   *
   * See https://developer.github.com/v3/oauth/.
   */
  state?: string;
}

export const QUERY_PROP_KEYS: (keyof QueryProps)[] = [
  '404',
  'code',
  'edit',
  'state',
];

export interface Song {
  /**
   * The SHA of the clean version of the song. Null if no version has been saved.
   *
   * Used to detect changes from other sources while editing a song.
   */
  baseSHA: string | null;

  /**
   * The version of the song, with all the edits.
   */
  src: string;
}

interface Props extends QueryProps {
  /**
   * From localStorage, information about the current GitHub user.
   */
  auth: Auth | null;

  /**
   * From localStorage, used as part of the GitHub OAuth flow.
   */
  csrf: string;

  /**
   * From localStorage, all songs that have changes not pushed to GitHub.
   */
  dirtySongs: {[key: string]: Song};

  /**
   * Mark a song as dirty and store it in localStorage.
   */
  editSong(songID: string, song: Song): void;

  /**
   * Remove a song from dirtySongs. This can be either because the song is now
   * clean, or because the local changes have been discarded. Updates localStorage.
   */
  markSongClean(song: string): void;

  /**
   * Logs in or out of GitHub. Updates localStorage.
   */
  setAuth(auth: Auth | null): void;

  /**
   * Sets the CSRF ("state") as part of the GitHub OAuth flow.
   */
  setCSRF(csrf: string): void;

  /**
   * Updates a field in the URL query.
   */
  setQuery<K extends keyof QueryProps>(updates: Pick<QueryProps, K>, replaceState?: boolean): void;
}

interface State {
  cleanSongs: {[key: string]: Song};
  connectToGitHubReason: string | null;
  defaultSelection: monaco.ISelection | null;
  help: boolean;
  interstitialChanges: {} | null;

  /**
   * True if we started editing this song in another tab.
   */
  locked: boolean;
  login: boolean;
  logs: string | null;
  menu: boolean;
  mode: ViewMode;
  pendingPreviews: number;
  publish: boolean;
  reconnectCooloff: number;
  reconnectTimeout: number;
  saving: boolean;
  wsError: boolean;
}

/**
 * Root component of Hacklily. This renders everything on the page.
 *
 * Receives props from the query (URL) as well as localStorage -- see index.tsx for how that works.
 */
export default class App extends React.PureComponent<Props, State> {
  state: State = {
    cleanSongs: {
      null: {
        baseSHA: null,
        src: '{ d4 }',
      },
    },
    connectToGitHubReason: null,
    defaultSelection: null,
    help: false,
    interstitialChanges: null,
    locked: false,
    login: false,
    logs: '',
    menu: false,
    mode: MODE_BOTH,
    pendingPreviews: 0,
    publish: false,
    reconnectCooloff: INITIAL_WS_COOLOFF,
    reconnectTimeout: NaN,
    saving: false,
    wsError: false,
  };

  private rpc: RPCClient | null = null;
  private socket: WebSocket | null = null;

  componentDidUpdate(prevProps: Props): void {
    if (this.props.edit !== prevProps.edit) {
      this.fetchSong();
      lock(this.props.edit || 'null');
    }
  }

  componentWillMount(): void {
    this.connectToWS();
    this.fetchSong();
    lock(this.props.edit || 'null');
    window.addEventListener('beforeunload', this.handleBeforeUnload);
    setEditingNotificationHandler(this.handleEditingNotification);
  }

  componentWillUnmount(): void {
    this.disconnectWS();
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    setEditingNotificationHandler(null);
  }

  render(): JSX.Element {
    const {
      state : {
        logs,
        mode,
        defaultSelection,
      },
      props: {
        auth,
        edit,
      },
    } = this;

    const online: boolean = this.isOnline();
    const preview: React.ReactNode = this.renderPreview();
    const song: Song | undefined = this.song();

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
          isDirty={this.isDirty()}
        />
        {this.renderModal()}
        <div className="content">
          <Editor
            code={song ? song.src : undefined}
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

  private cancelInterstitial = (): void => {
    this.setState({
      interstitialChanges: null,
    });
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

  private discardChanges = (): void => {
    if (!this.state.interstitialChanges) {
      throw new Error('Invariant violation');
    }
    const edit: string = this.props.edit || 'null';
    this.props.markSongClean(edit);
    this.props.setQuery(this.state.interstitialChanges);
    this.setState({
      interstitialChanges: null,
    });
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

  private async fetchSong(): Promise<void> {
    const { auth, edit } = this.props;
    if (!auth || edit === 'null' || !edit) {
      return;
    }
    const path: string = last(edit.split('/'));
    try {
      const { content, sha } = await cat(auth.accessToken, auth.repo, path);
      const cleanSongs: {[key: string]: Song} = JSON.parse(JSON.stringify(this.state.cleanSongs));
      cleanSongs[edit] = {
        baseSHA: sha,
        src: content,
      };

      this.setState({
        cleanSongs,
      });
    } catch (err) {
      if (err instanceof FileNotFound) {
        this.props.setQuery({
          edit: undefined,
          404: '1',
        });
      }
    }
  }

  private handleBeforeUnload = (ev: BeforeUnloadEvent): void => {
    // Don't bug users when going to GitHub OAuth
    if (this.state.login) {
      return;
    }

    // Don't bug users when they have no choice
    if (this.state.locked) {
      return;
    }

    if (this.isDirty()) {
      this.setState({
        interstitialChanges: null,
      });
      ev.returnValue = 'Changes you made have not been saved.';
    }
  }

  private handleClear404 = (): void => {
    this.props.setQuery({
      404: undefined,
    });
  }

  private handleCodeChanged = (newValue: string): void => {
    const { baseSHA, src: clean } = this.state.cleanSongs[this.props.edit || 'null'];
    if (clean === newValue) {
      this.props.markSongClean(this.props.edit || 'null');
    } else {
      this.props.editSong(this.props.edit || 'null', {
        baseSHA,
        src: newValue,
      });
    }
  }

  private handleDeleteSong = async (songID: string): Promise<void> => {
    try {
      this.setState({
        saving: true,
      });
      const { auth } = this.props;
      if (!auth || !this.rpc) {
        throw new Error('Invariant violation: contract broken');
      }
      const path: string = last(songID.split('/'));

      const ok: boolean = await unpublish(auth, path, this.rpc);

      if (ok) {
        const cleanSongs: {[key: string]: Song} =
          JSON.parse(JSON.stringify(this.state.cleanSongs));
        delete cleanSongs[songID];
        this.setState({
          cleanSongs,
          menu: false,
        });
        this.props.markSongClean(songID);
        this.props.setQuery({
          edit: undefined,
        });
      }
    } finally {
      this.setState({
        saving: false,
      });
    }
  }

  private handleEditingNotification = (song: string): void => {
    if (song === (this.props.edit || 'null')) {
      this.setState({
        locked: true,
      });
    }
  }

  private handleHideHelp = (): void => {
    this.setState({
      help: false,
    });
  }

  private handleHideLogin = (): void => {
    this.setState({
      connectToGitHubReason: null,
      login: false,
    });
  }

  private handleHideMenu = (): void => {
    this.setState({
      menu: false,
    });
  }

  private handleHidePublish = (): void => {
    this.setState({
      publish: false,
    });
  }

  private handleLoadSong = (edit: string): void => {
    this.setQueryOrShowInterstitial({
      edit,
    });
    this.setState({
      menu: false,
    });
  }

  private handleLogsObtained = (logs: string | null): void => {
    if (logs !== this.state.logs) {
      this.setState({
        logs,
      });
    }
  }

  private handleModeChanged = (mode: ViewMode): void => {
    this.setState({
      mode,
    });
  }

  private handlePublished = (edit: string): void => {
    this.props.markSongClean('null');
    if (this.state.interstitialChanges) {
      this.props.setQuery(this.state.interstitialChanges);
      this.setState({
        interstitialChanges: null,
      });
    } else {
      this.props.setQuery({
        edit,
      });
    }

    this.setState({
      publish: false,
    });
  }

  private handleResolveGitHub = (): void => {
    if (!this.props.edit) {
      // The sandbox can't have conflicts.
      throw new Error('Expected us to be editing a published song');
    }
    this.props.markSongClean(this.props.edit);
  }

  private handleResolveLocalStorage = (): void => {
    if (!this.props.edit) {
      // The sandbox can't have conflicts.
      throw new Error('Expected us to be editing a published song');
    }

    this.props.editSong(this.props.edit, {
      baseSHA: this.state.cleanSongs[this.props.edit].baseSHA,
      // tslint:disable-next-line:no-non-null-assertion
      src: this.song()!.src,
    });
  }

  private handleSelectionChanged = (selection: monaco.ISelection | null): void => {
    if (selection !== this.state.defaultSelection) {
      this.setState({
        defaultSelection: selection,
      });
    }
  }

  private handleShowHelp = (): void => {
    this.setState({
      help: true,
      menu: false,
    });
  }

  private handleShowMenu = (): void => {
    this.setState({
      help: false,
      menu: true,
    });
  }

  private handleShowNew = (): void => {
    if (!this.props.auth) {
      this.setState({
        connectToGitHubReason: 'Connect to GitHub to save this song',
        login: true,
      });
    } else {
      this.setQueryOrShowInterstitial({
        edit: undefined,
      });
    }
  }

  private handleShowPublish = (): void => {
    if (!this.props.auth) {
      this.setState({
        connectToGitHubReason: 'Connect to GitHub to share this song',
        login: true,
      });
    } else if (this.props.edit) {
      this.handleUpdateGitHub();
    } else {
      this.setState({
        publish: true,
      });
    }
  }

  private handleSignIn = (): void => {
    this.setState({
      connectToGitHubReason: null,
      login: true,
      menu: false,
      publish: false,
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
    localStorage.clear();
    revokeGitHubAuth(this.rpc, token);
  }

  private handleUpdateGitHub = async (): Promise<void> => {
    try {
      this.setState({
        saving: true,
      });
      const song: Song | undefined = this.song();
      const { auth, edit } = this.props;
      if (!auth || !edit || !song || !this.rpc) {
        throw new Error('Invariant violation: contract broken');
      }
      const path: string = last(edit.split('/'));

      const ok: boolean = await publish(song.src, auth, path, this.rpc, true);

      if (ok) {
        const cleanSongs: {[key: string]: Song} =
          JSON.parse(JSON.stringify(this.state.cleanSongs));
        cleanSongs[edit] = {
          baseSHA: song.baseSHA,
          src: song.src,
        };
        this.setState({
          cleanSongs,
        });
        this.props.markSongClean(edit);
      }
    } finally {
      this.setState({
        saving: false,
      });
      if (this.state.interstitialChanges) {
        this.props.setQuery(this.state.interstitialChanges);
        this.setState({
          interstitialChanges: null,
        });
      }
    }
  }

  private handleWSError = (e: ErrorEvent): void => {
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

  private hasConflict(): boolean {
    const { dirtySongs, edit } = this.props;
    const { cleanSongs } = this.state;
    const songName: string = edit || 'null';

    const dirtySong: Song | undefined = dirtySongs[songName];
    const cleanSong: Song | undefined = cleanSongs[songName];

    return dirtySong && cleanSong && dirtySong.baseSHA !== cleanSong.baseSHA;
  }

  private isDirty(): boolean {
    const { edit, dirtySongs } = this.props;

    return dirtySongs[edit || 'null'] !== undefined;
  }

  private isOnline(): boolean {
    return Boolean(this.rpc);
  }

  private renderModal(): React.ReactNode {
    const {
      state : {
        locked,
        login,
        connectToGitHubReason,
        help,
        menu,
        publish,
        interstitialChanges,
        saving,
      },
      props: {
        auth,
        csrf,
        setCSRF,
        '404': _404,
      },
    } = this;
    const song: Song | undefined = this.song();
    const conflict: boolean = this.hasConflict();

    switch (true) {
      case locked:
        return <ModalLocked />;
      case _404 !== undefined:
        return (
          <Modal404
            onHide={this.handleClear404}
          />
        );
      case saving:
        return <ModalSaving />;
      case conflict:
        return (
          <ModalConflict
            resolveGitHub={this.handleResolveGitHub}
            resolveLocalStorage={this.handleResolveLocalStorage}
          />
        );
      case login:
        return (
          <ModalLogin
            connectToGitHubReason={connectToGitHubReason}
            onHide={this.handleHideLogin}
            csrf={csrf}
            setCSRF={setCSRF}
          />
        );
      case help:
        return (
          <ModalAbout
            onHide={this.handleHideHelp}
          />
        );
      case publish:
        if (song && auth && this.rpc) {
          return (
            <ModalPublish
              onHide={this.handleHidePublish}
              onPublished={this.handlePublished}
              auth={auth}
              code={song.src}
              rpc={this.rpc}
            />
          );
        } else {
          return null;
        }
      case menu:
        return (
          <Menu
            auth={auth}
            onDeleteSong={this.handleDeleteSong}
            onHide={this.handleHideMenu}
            onShowAbout={this.handleShowHelp}
            onSignIn={this.handleSignIn}
            onSignOut={this.handleSignOut}
            onLoadSong={this.handleLoadSong}
          />
        );
      case (interstitialChanges !== null):
        return (
          <ModalUnsavedChangesInterstitial
            discardChanges={this.discardChanges}
            cancel={this.cancelInterstitial}
            save={this.handleShowPublish}
          />
        );
      default:
        return null;
    }
  }

  private renderPreview(): React.ReactNode {
    const { mode, reconnectTimeout, logs, wsError } = this.state;

    const song: Song | undefined = this.song();

    const online: boolean = this.isOnline();
    if (!song) {
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
            code={song.src}
            mode={mode}
            onLogsObtained={this.handleLogsObtained}
            onSelectionChanged={this.handleSelectionChanged}
            rpc={this.rpc}
            logs={logs}
          />
        );
      } else {
        const previewMaskStyle: string = css(
          APP_STYLE.pendingPreviewMask,
          mode === MODE_VIEW && APP_STYLE.previewPendingMaskModeView,
        );

        return (
          <span>
            <div
                className={css(APP_STYLE.sheetMusicView)}
                style={{ width: mode === MODE_BOTH ? '50%' : (mode === MODE_VIEW ? '100%' : '0') }}
            />
            <div className={previewMaskStyle} />
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

  private setQueryOrShowInterstitial = <K extends keyof QueryProps>(updates: Pick<QueryProps, K>,
  ) : void => {
    if (this.isDirty()) {
      this.setState({
        interstitialChanges: updates,
      });
    } else {
      this.props.setQuery(updates);
    }
  }

  private song(): Song | undefined {
    const { dirtySongs, edit } = this.props;
    const { cleanSongs } = this.state;
    const songName: string = edit || 'null';

    const song: Song | undefined = dirtySongs[songName] || cleanSongs[songName];
    if (!song) {
      return undefined;
    }

    return song;
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
}
