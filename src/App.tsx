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
import Header, { MIN_BOTH_WIDTH, MODE_BOTH, MODE_EDIT, MODE_VIEW, ViewMode } from './Header';
import Menu from './Menu';
import Modal404 from './Modal404';
import ModalAbout from './ModalAbout';
import ModalConflict from './ModalConflict';
import ModalLocked, { lock, setEditingNotificationHandler } from './ModalLocked';
import ModalLogin, {
  Auth,
  checkLogin,
  redirectToLogin,
  revokeGitHubAuth,
} from './ModalLogin';
import ModalPublish, { publish, unpublish } from './ModalPublish';
import ModalSaving from './ModalSaving';
import ModalUnsavedChangesInterstitial from './ModalUnsavedChangesInterstitial';
import Preview from './Preview';
import RPCClient from './RPCClient';
import StandaloneAppHost from './StandaloneAppHost';
import { APP_STYLE } from './styles';

function last<T>(t: T[]): T {
  return t[t.length - 1];
}

const INITIAL_WS_COOLOFF: number = 2;
const BACKEND_WS_URL: string | undefined = process.env.REACT_APP_BACKEND_WS_URL;
const PUBLIC_READONLY: string = 'PUBLIC_READONLY';

/**
 * Properties derived from URL.
 *
 * e.g., https://www.hacklily.org/?edit=hacklily/user-jnetterf/test.ly =>
 *   {
 *     edit: 'hacklily/user-jnetterf/test.ly',
 *   }
 *
 * NOTE: When you add a key here, also add it to QUERY_PROP_KEYS below.
 */
export interface QueryProps {
  /**
   * Truthy if this was redirected from a 404 page.
   */
  '404'?: string;

  /*
   * Truthy if we should show the about page.
   */
  about?: string;

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
   * In standalone mode, whether to show the import dialog.
   */
  standaloneImport?: boolean;

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
  'about',
  'code',
  'edit',
  'state',
  'standaloneImport',
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
  isStandalone: boolean;

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
  interstitialChanges: {} | null;

  /**
   * In the standalone app, songs that are in the local song
   * folder.
   */
  localFiles: string[] | null;

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
  windowWidth: number;
  wsError: boolean;
}

const DEFAULT_SONG: string =
`\\header {
  title = "Untitled"
  composer = "Composer"
}

\\relative d' { d4 }`;

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
        src: DEFAULT_SONG,
      },
    },
    connectToGitHubReason: null,
    defaultSelection: null,
    interstitialChanges: null,
    localFiles: null,
    locked: false,
    login: false,
    logs: '',
    menu: false,
    mode: window.innerWidth >= MIN_BOTH_WIDTH ? MODE_BOTH : MODE_VIEW,
    pendingPreviews: 0,
    publish: false,
    reconnectCooloff: INITIAL_WS_COOLOFF,
    reconnectTimeout: NaN,
    saving: false,
    windowWidth: window.innerWidth,
    wsError: false,
  };

  private editor: Editor | null = null;
  private preview: Preview | null = null;
  private rpc: RPCClient | null = null;
  private socket: WebSocket | null = null;
  private standaloneAppHost: StandaloneAppHost | null = null;

  componentDidMount(): void {
    window.addEventListener('resize', this.handleWindowResize);
  }

  componentDidUpdate(prevProps: Props): void {
    if (this.props.edit !== prevProps.edit) {
      this.fetchSong();
      lock(this.props.edit || 'null');
    }
    if (this.props.isStandalone && !this.props.auth && this.props.csrf && !this.props.code) {
      redirectToLogin(this.props.csrf);
    }
  }

  componentWillMount(): void {
    this.connectToWS();
    this.fetchSong();
    lock(this.props.edit || 'null');
    window.addEventListener('beforeunload', this.handleBeforeUnload);
    setEditingNotificationHandler(this.handleEditingNotification);
    if (this.props.isStandalone && !this.props.auth && !this.props.csrf) {
      const randomContainer: Uint32Array = new Uint32Array(1);
      crypto.getRandomValues(randomContainer);
      const csrf: string = randomContainer[0].toString();
      this.props.setCSRF(csrf);
    }
  }

  componentWillUnmount(): void {
    this.disconnectWS();
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    window.addEventListener('resize', this.handleWindowResize);
    setEditingNotificationHandler(null);
  }

  render(): JSX.Element {
    const {
      state : {
        logs,
        mode,
        defaultSelection,
        windowWidth,
      },
      props: {
        auth,
        edit,
        isStandalone,
      },
    } = this;

    const online: boolean = this.isOnline();
    const preview: React.ReactNode = this.renderPreview();
    const song: Song | undefined = this.song();

    const header: React.ReactNode = !isStandalone && (
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
        windowWidth={windowWidth}
      />
    );

    return (
      <div className={`App ${isStandalone ? 'standalone' : ''}`}>
        {header}
        {this.renderModal()}
        <div className="content">
          <Editor
            ref={this.setEditor}
            code={song ? song.src : undefined}
            mode={mode}
            onSetCode={this.handleCodeChanged}
            logs={logs}
            defaultSelection={defaultSelection}
            readOnly={song ? song.baseSHA === PUBLIC_READONLY : true}
          />
          {preview}
        </div>
        <StandaloneAppHost
          ref={this.setStandaloneAppHost}
          auth={auth}
          showOpenDialog={this.state.menu}
          showSaveAs={this.state.publish}
          showUnsavedChangesDialog={!!this.state.interstitialChanges}
          showImport={!!this.props.standaloneImport}
          showSaving={this.state.saving}
          onNewSong={this.handleShowNew}
          onOpen={this.handleOpen}
          onOpenFile={this.handleOpenFileStandalone}
          onOpenCancel={this.handleHideMenu}
          onImport={this.handleImport}
          onImportRejected={this.handleImportRejected}
          onRequestImport={this.handleImportRequested}
          onSave={this.handleShowPublish}
          onSaveAsCancel={this.handleHidePublish}
          onSaveAsFile={this.standalonePublish}
          onFind={this.handleFind}
          onFindNext={this.handleFindNext}
          onViewMode={this.handleModeChangedView}
          onSelectAll={this.handleSelectAll}
          onSplitMode={this.handleModeChangedSplit}
          onCodeMode={this.handleModeChangedEdit}
          onAboutHacklily={this.handleShowHelp}
          onExportRequested={this.handleExport}
          onLocalFilesChanged={this.handleLocalFilesChanged}
          onUnsavedChangesCancel={this.cancelInterstitial}
          onUnsavedChangesDiscard={this.discardChanges}
          onUnsavedChangesSave={this.handleShowPublish}
        />
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
    if (edit === 'null' || !edit) {
      return;
    }

    const path: string[] = edit.split('/');
    const requestedRepo: string = `${path[0]}/${path[1]}`;
    const requestedFile: string = path.slice(2).join('/');

    // TODO(joshuan): For logged in users, allow them to edit files in any
    // repo they control.

    if (!auth || auth.repo !== requestedRepo) {
      const req: Response = await fetch(
        `https://raw.githubusercontent.com/${requestedRepo}/` +
        `master/${requestedFile}`);

      if (req.status >= 400) {
        alert('Could not fetch the requested song.');

        return;
      }
      const content: string = await req.text();
      const cleanSongs: {[key: string]: Song} = JSON.parse(JSON.stringify(this.state.cleanSongs));
      if (cleanSongs[edit]) {
        // We have a better version.
        return;
      }
      cleanSongs[edit] = {
        baseSHA: PUBLIC_READONLY,
        src: content,
      };

      this.setState({
        cleanSongs,
      });

      return;
    }

    try {
      const { content, sha } = await cat(auth.accessToken, auth.repo, requestedFile);
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

    // Don't bug users in the app
    if (this.props.isStandalone) {
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

  private handleExport = (): void => {
    throw new Error('Not implemented');
  }

  private handleFind = (): void => {
    if (this.editor) {
      this.editor.find();
    }
  }

  private handleFindNext = (): void => {
    if (this.editor) {
      this.editor.findNext();
    }
  }

  private handleHideHelp = (): void => {
    this.props.setQuery({
      about: undefined,
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
    if (this.state.interstitialChanges) {
      this.cancelInterstitial();
    }
  }

  private handleImport = async (name: string, src: string): Promise<void> => {
    this.props.setQuery(
      {
        edit: undefined,
      },
      true,
    );
    this.props.editSong('null', {
      baseSHA: null,
      src,
    });
    this.handleShowPublish();
  }

  private handleImportRejected = (): void => {
    this.props.setQuery({
      standaloneImport: undefined,
    });
  }

  private handleImportRequested = (): void => {
    this.setQueryOrShowInterstitial({
      standaloneImport: true,
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

  private handleLocalFilesChanged = (): void => {
    if (this.standaloneAppHost) {
      this.setState({
        localFiles: this.standaloneAppHost.localFiles,
      });
    }
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

  private handleModeChangedEdit = (): void => {
    this.handleModeChanged(MODE_EDIT);
  }

  private handleModeChangedSplit = (): void => {
    this.handleModeChanged(MODE_BOTH);
  }

  private handleModeChangedView = (): void => {
    this.handleModeChanged(MODE_VIEW);
  }

  private handleOpen = (): void => {
    this.setState({
      menu: true,
    });
  }

  private handleOpenFileStandalone = (filename: string, source: 'remote' | 'local',
                                      sha: string, contents: string): void => {
    const { auth } = this.props;
    this.handleHideMenu();
    if (source === 'remote') {
      if (!auth) {
        throw new Error('Not signed in. Cannot open remote file.');
      }
      this.handleLoadSong(`${auth.repo}/${filename}`);
    } else {
      throw new Error('Not implemented');
    }
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

  private handleSelectAll = (): void => {
    if (this.editor) {
      this.editor.selectAll();
    }
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
      menu: false,
    });
    this.props.setQuery({
      about: '1',
    });
  }

  private handleShowMenu = (): void => {
    this.setState({
      menu: true,
    });
    if (this.props.about) {
      this.props.setQuery({
        about: undefined,
      });
    }
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

      try {
        await publish(song.src, auth, path, this.rpc, true);
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
      } catch (err) {
        alert(err.toString());
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

  private handleWindowResize = (): void => {
    this.setState({
      windowWidth: window.innerWidth,
    });
    if (this.state.mode === MODE_BOTH && window.innerWidth <= MIN_BOTH_WIDTH) {
      this.setState({
        mode: MODE_VIEW,
      });
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
        this.props.setAuth(auth);
        this.props.setQuery({
          code: undefined,
          state: undefined,
        });
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
        menu,
        publish,
        interstitialChanges,
        saving,
      },
      props: {
        about,
        auth,
        csrf,
        isStandalone,
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
      case saving && !isStandalone:
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
      case Boolean(about):
        return (
          <ModalAbout
            onHide={this.handleHideHelp}
          />
        );
      case publish:
        if (song && auth && this.rpc && !isStandalone) {
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
      case menu && !isStandalone:
        return (
          <Menu
            auth={auth}
            windowWidth={this.state.windowWidth}
            onDeleteSong={this.handleDeleteSong}
            onHide={this.handleHideMenu}
            onShowAbout={this.handleShowHelp}
            onSignIn={this.handleSignIn}
            onSignOut={this.handleSignOut}
            onLoadSong={this.handleLoadSong}
          />
        );
      case (interstitialChanges !== null && !isStandalone):
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
    const { isStandalone } = this.props;
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
    } else if (this.socket || isStandalone) {
      if (online && this.rpc || isStandalone) {
        return (
          <Preview
            code={song.src}
            isStandalone={isStandalone}
            mode={mode}
            onLogsObtained={this.handleLogsObtained}
            onSelectionChanged={this.handleSelectionChanged}
            ref={this.setPreview}
            rpc={isStandalone ? null : this.rpc}
            standaloneRender={this.standaloneRender}
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

  private setEditor = (editor: Editor | null): void => {
    this.editor = editor;
  }

  private setPreview = (preview: Preview): void => {
    this.preview = preview;
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

  private setStandaloneAppHost = (standaloneAppHost: StandaloneAppHost): void => {
    this.standaloneAppHost = standaloneAppHost;
    if (standaloneAppHost) {
      this.setState({
        localFiles: standaloneAppHost.localFiles,
      });
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

  private standalonePublish = async (path: string, source: 'local' | 'remote'): Promise<void> => {
    this.setState({
      publish: false,
    });
    try {
      this.setState({
        saving: true,
      });
      const song: Song | undefined = this.song();
      const { auth } = this.props;
      if (!auth || !song || !this.rpc) {
        throw new Error('Invariant violation: contract broken');
      }

      try {
        const fullPath: string = source === 'local' ? `local/${path}` : `${auth.repo}/${path}`;
        if (source === 'remote') {
          await publish(song.src, auth, path, this.rpc, false);
        } else {
          if (!this.standaloneAppHost) {
            throw new Error('Expected standaloneAppHost when saving locally...');
          }
          await this.standaloneAppHost.save(song.src, path);
        }
        this.handlePublished(fullPath);
      } catch (err) {
        this.setState(
          {
            saving: false,
          },
          () => {
            // We need to disable the saving dialog first, or else we get
            // a deadlock in Qt on macOS.
            alert(err.toString());
          },
        );
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

  // tslint:disable-next-line:promise-function-async
  private standaloneRender = (src: string, filetype: string):
      Promise<{content: string[], logs: string}> => {
    if (!this.standaloneAppHost) {
      throw new Error('Function only valid in standalone mode.');
    }

    return this.standaloneAppHost.renderLy(src, filetype);
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
