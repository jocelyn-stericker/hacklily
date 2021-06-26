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

import { Icon } from "@blueprintjs/core";
import { css } from "aphrodite";
import Makelily from "makelily"; // note: use for types only
import * as monacoEditor from "monaco-editor";
import React from "react";

import { Auth, checkLogin, revokeGitHubAuth } from "./auth";
import Editor from "./Editor";
import { cat, FileNotFound, getOrCreateRepo } from "./gitfs";
import Header, {
  MIN_BOTH_WIDTH,
  MODE_BOTH,
  MODE_VIEW,
  ViewMode,
} from "./Header";
import Modal404 from "./Modal404";
import ModalAbout from "./ModalAbout";
import ModalConflict from "./ModalConflict";
import ModalLocked, {
  lock,
  setEditingNotificationHandler,
} from "./ModalLocked";
import ModalLogin from "./ModalLogin";
import ModalOpen from "./ModalOpen";
import ModalPublish, { doPublish, doUnpublish } from "./ModalPublish";
import ModalSaving from "./ModalSaving";
import ModalUnsavedChangesInterstitial from "./ModalUnsavedChangesInterstitial";
import Preview from "./Preview";
import RPCClient from "./RPCClient";
import { APP_STYLE } from "./styles";

function last<T>(t: T[]): T {
  return t[t.length - 1];
}

const INITIAL_WS_COOLOFF: number = 2;
const BACKEND_WS_URL: string | undefined = process.env.REACT_APP_BACKEND_WS_URL;
const PUBLIC_READONLY: string = "PUBLIC_READONLY";

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
  "404"?: string;

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
   * If truthy, and we are authenticated, show a dialog to save a
   * copy of this song.
   */
  saveAs?: string;

  /**
   * When set, open a read-only sandbox with this code.
   * Takes precedence over "edit".
   */
  src?: string;

  /**
   * When logging in from GitHub, this is the CSRF, generated in ConnectToGitHub.
   *
   * See also 'code'.
   *
   * See https://developer.github.com/v3/oauth/.
   */
  state?: string;
}

export const QUERY_PROP_KEYS: Array<keyof QueryProps> = [
  "404",
  "about",
  "code",
  "edit",
  "saveAs",
  "src",
  "state",
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
   * From localStorage, the color scheme.
   */
  colourScheme: "vs-dark" | "vs";

  /**
   * From localStorage, used as part of the GitHub OAuth flow.
   */
  csrf: string;

  /**
   * From localStorage, all songs that have changes not pushed to GitHub.
   */
  dirtySongs: { [key: string]: Song };

  /**
   * True if the warning that is shown when LilyPond 2.19 is used should be shown.
   */
  hideUnstable219Notification: boolean;

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
   * Stores the color scheme in localStorage.
   */
  setColourScheme(colourScheme: "vs-dark" | "vs"): void;

  /**
   * Sets the CSRF ("state") as part of the GitHub OAuth flow.
   */
  setCSRF(csrf: string): void;

  /**
   * Sets whether the warning that is shown when LilyPond 2.19 is used should be shown.
   */
  setHideUnstable219Notification(hideUnstable219Notification: boolean): void;

  /**
   * Updates a field in the URL query.
   */
  setQuery<K extends keyof QueryProps>(
    updates: Pick<QueryProps, K>,
    replaceState?: boolean,
  ): void;
}

interface State {
  cleanSongs: { [key: string]: Song };
  defaultSelection: monacoEditor.ISelection | null;
  interstitialChanges: {} | null;

  /**
   * True if we started editing this song in another tab.
   */
  locked: boolean;
  login: boolean;
  logs: string | null;
  makelilyClef: string;
  makelilyKey: string;
  makelilySingleTaskMode: boolean;
  makelilyTime: string;
  makelilyTool: string;
  midi: ArrayBuffer | null;
  mode: ViewMode;
  pendingPreviews: number;
  publish: boolean;
  reconnectCooloff: number;
  reconnectTimeout: number;
  rendererVersion: "stable" | "unstable";
  open: boolean;
  saving: boolean;
  showMakelily: typeof Makelily | null;
  windowWidth: number;
  wsError: boolean;

  makelilyInsertCB?(ly: string): void;
}

const DEFAULT_SONG: string = `\\header {
  title = "Untitled"
  composer = "Composer"
}

\\score {
  \\relative c' {
    c4
  }

  \\layout {}
  \\midi {}
}`;

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
    defaultSelection: null,
    interstitialChanges: null,
    locked: false,
    login: false,
    logs: "",
    makelilyClef: "treble",
    makelilyKey: "c \\major",
    makelilySingleTaskMode: true,
    makelilyTime: "4/4",
    makelilyTool: "notes",
    midi: null,
    mode: window.innerWidth >= MIN_BOTH_WIDTH ? MODE_BOTH : MODE_VIEW,
    pendingPreviews: 0,
    publish: false,
    reconnectCooloff: INITIAL_WS_COOLOFF,
    reconnectTimeout: NaN,
    rendererVersion: "stable",
    open: false,
    saving: false,
    showMakelily: null,
    windowWidth: window.innerWidth,
    wsError: false,
  };

  private editor: Editor | null = null;
  private rpc: RPCClient | null = null;
  private socket: WebSocket | null = null;

  componentDidMount(): void {
    window.addEventListener("resize", this.handleWindowResize);
    this.connectToWS();
    this.fetchSong();
    lock(this.props.edit || "null");
    window.addEventListener("beforeunload", this.handleBeforeUnload);
    setEditingNotificationHandler(this.handleEditingNotification);
  }

  componentDidUpdate(prevProps: Props): void {
    if (this.props.edit !== prevProps.edit) {
      this.fetchSong();
      lock(this.props.edit || "null");
    }
    if (
      !this.props.auth &&
      !this.state.login &&
      !this.props.state &&
      this.props.saveAs
    ) {
      // We're not in a situation where we can save as, so remove that query.
      this.props.setQuery(
        {
          saveAs: undefined,
        },
        true,
      );
    }
  }

  componentWillUnmount(): void {
    this.disconnectWS();
    window.removeEventListener("beforeunload", this.handleBeforeUnload);
    window.addEventListener("resize", this.handleWindowResize);
    setEditingNotificationHandler(null);
  }

  render(): JSX.Element {
    const { logs, mode, midi, defaultSelection, rendererVersion, windowWidth } =
      this.state;

    const {
      auth,
      edit,
      hideUnstable219Notification,
      colourScheme,
      setColourScheme,
    } = this.props;

    const online: boolean = this.isOnline();
    const preview: React.ReactNode = this.renderPreview();
    const song: Song | undefined = this.song();
    const sandboxIsDirty: boolean =
      Boolean(this.props.edit || this.props.src) &&
      Boolean(this.props.dirtySongs.null);

    let songURL: string | null = null;
    if (this.props.edit) {
      const songParts: string[] = this.props.edit.split("/");
      songURL = `https://github.com/${songParts[0]}/${
        songParts[1]
      }/blob/master/${songParts.slice(2).join("/")}`;
    }

    const header: React.ReactNode = (
      <Header
        setColourScheme={setColourScheme}
        onDeleteSong={this.handleDeleteSong}
        onLoadSong={this.handleLoadSong}
        onShowAbout={this.handleShowHelp}
        onSignIn={this.handleSignIn}
        onSignOut={this.handleSignOut}
        auth={auth}
        mode={mode}
        midi={midi}
        online={online}
        loggedIn={auth !== null}
        onModeChanged={this.handleModeChanged}
        onShowClone={this.handleShowSaveAs}
        onShowMakelily={this.handleShowMakelily}
        onShowNew={this.handleShowNew}
        onShowOpen={this.handleShowOpen}
        onShowPublish={this.handleShowPublish}
        sandboxIsDirty={sandboxIsDirty}
        song={this.props.src ? "untitled-import" : edit}
        inSandbox={!this.props.edit && !this.props.src}
        isDirty={this.isDirty()}
        readOnly={
          Boolean(this.props.src) ||
          (song ? song.baseSHA === PUBLIC_READONLY : false)
        }
        windowWidth={windowWidth}
        colourScheme={colourScheme}
        canExport={Boolean(
          online && this.rpc && logs && this.state.pendingPreviews === 0,
        )}
        onExportLy={this.handleExportLy}
        onExportMIDI={this.handleExportMIDI}
        onExportPDF={this.handleExportPDF}
        songURL={songURL}
      />
    );

    return (
      <div className="App">
        {header}
        {this.renderModal()}
        <div className="content">
          <Editor
            ref={this.setEditor}
            code={song ? song.src : undefined}
            colourScheme={this.props.colourScheme}
            mode={mode}
            hideUnstable219Notification={hideUnstable219Notification}
            onSetCode={this.handleCodeChanged}
            onHideUnstableNotification={this.handleHideUnstableNotification}
            logs={logs}
            defaultSelection={defaultSelection}
            readOnly={song ? song.baseSHA === PUBLIC_READONLY : false}
            isImmutableSrc={Boolean(this.props.src)}
            showMakelily={this.handleShowMakelily}
            rendererVersion={rendererVersion}
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

  private discardChanges = (): void => {
    if (!this.state.interstitialChanges) {
      throw new Error("Invariant violation");
    }
    const edit: string = this.props.edit || "null";
    this.props.markSongClean(edit);
    this.props.setQuery(this.state.interstitialChanges);
    this.setState({
      interstitialChanges: null,
    });
  };

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

  private async fetchSong(): Promise<void> {
    const { auth, edit } = this.props;
    if (edit === "null" || !edit) {
      return;
    }

    const path: string[] = edit.split("/");
    const requestedRepo: string = `${path[0]}/${path[1]}`;
    const requestedFile: string = path.slice(2).join("/");

    // TODO(jocelyn): For logged in users, allow them to edit files in any
    // repo they control.

    if (!auth || auth.repo !== requestedRepo) {
      const req: Response = await fetch(
        `https://raw.githubusercontent.com/${requestedRepo}/` +
          `master/${requestedFile}`,
      );

      if (req.status >= 400) {
        alert("Could not fetch the requested song.");

        return;
      }
      const content: string = await req.text();
      const cleanSongs: { [key: string]: Song } = JSON.parse(
        JSON.stringify(this.state.cleanSongs),
      );
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
      const { content, sha } = await cat(
        auth.accessToken,
        auth.repo,
        requestedFile,
      );
      const cleanSongs: { [key: string]: Song } = JSON.parse(
        JSON.stringify(this.state.cleanSongs),
      );
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
          src: undefined,
          404: "1",
        });
      }
    }
  }

  private getSongName = (): string => {
    const songParts: string[] = this.props.edit
      ? this.props.edit.split("/")
      : ["untitled"];
    return songParts[songParts.length - 1];
  };

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
      ev.returnValue = "Changes you made have not been saved.";
    }
  };

  private handleClear404 = (): void => {
    this.props.setQuery({
      404: undefined,
    });
  };

  private handleCodeChanged = (newValue: string): void => {
    const { baseSHA, src: clean } =
      this.state.cleanSongs[this.props.edit || "null"];
    if (clean === newValue) {
      this.props.markSongClean(this.props.edit || "null");
    } else {
      this.props.editSong(this.props.edit || "null", {
        baseSHA,
        src: newValue,
      });
    }
  };

  private handleDeleteSong = async (songID: string): Promise<void> => {
    try {
      this.setState({
        saving: true,
      });
      const { auth } = this.props;
      if (!auth || !this.rpc) {
        throw new Error("Invariant violation: contract broken");
      }
      const path: string = last(songID.split("/"));

      const ok: boolean = await doUnpublish(auth, path, this.rpc);

      if (ok) {
        const cleanSongs: { [key: string]: Song } = JSON.parse(
          JSON.stringify(this.state.cleanSongs),
        );
        delete cleanSongs[songID];
        this.setState({
          cleanSongs,
        });
        this.props.markSongClean(songID);
        this.props.setQuery({
          edit: undefined,
          src: undefined,
        });
      }
    } finally {
      this.setState({
        saving: false,
      });
    }
  };

  private handleEditingNotification = (song: string): void => {
    if (song === (this.props.edit || "null")) {
      this.setState({
        locked: true,
      });
    }
  };

  private handleExportMIDI = (): void => {
    const { midi } = this.state;
    if (!midi) {
      alert(
        "No MIDI data found. Make sure you have " +
          "a \\midi {} and a \\layout {} in your \\score {}.",
      );
      return;
    }

    const name = this.getSongName();
    const blob = new Blob([midi], { type: "audio/midi" });
    const src = URL.createObjectURL(blob);

    this.triggerDownload(`${name}.midi`, src);
  };

  private handleExportPDF = async (): Promise<void> => {
    const song = this.song();
    if (!song) {
      alert("Could not export PDF.");
      return;
    }

    const rpc = this.rpc;
    if (!rpc) {
      alert("Could not connect to server");
      return;
    }

    // TODO TRIGGER LOADING

    const name = this.getSongName();

    try {
      // Decide whether to use the stable version or not.
      let version: "unstable" | "stable" = "stable";
      const maybeVersion = /\\version\s*"(\d+)\.?(\d+)?\.?(\d+)?/gm.exec(
        song.src,
      );
      const versionSlices = maybeVersion
        ? maybeVersion.slice(1).map((v) => parseInt(v, 10))
        : [];
      const isUnstable = versionSlices[0] === 2 && versionSlices[1] > 18;
      version = isUnstable ? "unstable" : "stable";

      const pdf: string = (
        await rpc.call("render", {
          version,
          backend: "pdf",
          src: song.src,
        })
      ).result.files[0];

      console.log(pdf);

      this.triggerDownload(`${name}.pdf`, "data:text/plain;base64," + pdf);
    } catch (err) {
      alert("Could not export PDF.");
    }

    return;
  };

  private handleExportLy = (): void => {
    const song = this.song();
    if (!song) {
      alert("Could not export lilypond source.");
      return;
    }

    const name = this.getSongName();
    this.triggerDownload(
      `${name}.ly`,
      "data:text/plain;charset=utf-8," + encodeURIComponent(song.src),
    );
  };

  private handleHideHelp = (): void => {
    this.props.setQuery({
      about: undefined,
    });
  };

  private handleHideOpen = (): void => {
    this.setState({
      open: false,
    });
  };

  private handleHideLogin = (): void => {
    this.setState({
      login: false,
    });
  };

  private handleHideMakelily = (): void => {
    this.setState({
      makelilyInsertCB: undefined,
      showMakelily: null,
    });
  };

  private handleHidePublish = (): void => {
    if (this.props.saveAs) {
      this.props.setQuery({
        saveAs: undefined,
      });
    } else {
      this.setState({
        publish: false,
      });
    }
    if (this.state.interstitialChanges) {
      this.cancelInterstitial();
    }
  };

  private handleHideUnstableNotification = (): void => {
    this.props.setHideUnstable219Notification(true);
  };

  private handleInsertLy = (ly: string): void => {
    if (this.editor) {
      if (this.state.makelilyInsertCB) {
        this.state.makelilyInsertCB(`${ly}\n`);
      } else {
        this.editor.insertText(`\n${ly}\n`);
      }
    }
    this.setState({
      makelilyInsertCB: undefined,
      showMakelily: null,
    });
  };

  private handleLoadSong = (edit: string): void => {
    this.setQueryOrShowInterstitial({
      edit,
      src: undefined,
    });
    this.setState({
      open: false,
    });
  };

  private handleLogsObtained = (
    logs: string | null,
    version: "stable" | "unstable",
  ): void => {
    if (logs !== this.state.logs) {
      this.setState({
        logs,
        rendererVersion: version,
      });
    }
  };

  private handleMidiObtained = (midi: ArrayBuffer | null): void => {
    if (midi !== this.state.midi) {
      this.setState({
        midi,
      });
    }
  };

  private handleModeChanged = (mode: ViewMode): void => {
    this.setState({
      mode,
    });
  };

  private handlePublished = (edit: string): void => {
    this.props.markSongClean("null");
    if (this.state.interstitialChanges) {
      this.props.setQuery(this.state.interstitialChanges);
      this.setState({
        interstitialChanges: null,
      });
    } else {
      this.props.setQuery({
        edit,
        saveAs: undefined,
        src: undefined,
      });
    }

    this.setState({
      publish: false,
    });

    if (!this.rpc) {
      throw new Error("Expected rpc to be defined");
    }

    this.rpc.call("notifySaved", {});
  };

  private handleResolveGitHub = (): void => {
    if (!this.props.edit) {
      // The sandbox can't have conflicts.
      throw new Error("Expected us to be editing a published song");
    }
    this.props.markSongClean(this.props.edit);
  };

  private handleResolveLocalStorage = (): void => {
    if (!this.props.edit) {
      // The sandbox can't have conflicts.
      throw new Error("Expected us to be editing a published song");
    }

    this.props.editSong(this.props.edit, {
      baseSHA: this.state.cleanSongs[this.props.edit].baseSHA,
      src: this.song()!.src,
    });
  };

  private handleSelectionChanged = (
    selection: monacoEditor.ISelection | null,
  ): void => {
    if (selection !== this.state.defaultSelection) {
      this.setState({
        defaultSelection: selection,
      });
    }
  };

  private handleShowHelp = (): void => {
    this.props.setQuery({
      about: "1",
    });
  };

  private handleShowOpen = (): void => {
    this.setState({
      open: true,
    });
  };

  private handleShowMakelily = async (
    tool?: string,
    cb?: (ly: string) => void,
  ): Promise<void> => {
    const editor: Editor | null = this.editor;
    if (!editor) {
      return;
    }

    const makelilyComponent: typeof Makelily = (await import("makelily"))
      .default;

    this.setState({
      showMakelily: makelilyComponent,
      ...editor.getMakelilyProperties(),
      makelilyInsertCB: cb,
      makelilySingleTaskMode: !!tool,
      makelilyTool: tool || this.state.makelilyTool,
    });
  };

  private handleShowNew = (): void => {
    this.setQueryOrShowInterstitial({
      edit: undefined,
      src: undefined,
    });
  };

  private handleShowPublish = (): void => {
    if (!this.props.auth) {
      this.setState({
        login: true,
      });
    } else if (this.props.edit) {
      this.handleUpdateGitHub();
    } else {
      this.setState({
        publish: true,
      });
    }
  };

  private handleShowSaveAs = (): void => {
    if (!this.props.auth) {
      this.setState({
        login: true,
      });
      this.props.setQuery(
        {
          saveAs: "1",
        },
        // HACK: replace because going back in history won't clear the login modal
        true,
      );
    } else {
      this.props.setQuery({
        saveAs: "1",
      });
    }
  };

  private handleSignIn = (): void => {
    this.setState({
      login: true,
      publish: false,
    });
  };

  private handleSignOut = (): void => {
    const { auth } = this.props;

    if (!this.rpc) {
      alert("Cannot sign out because you are not connected to the server.");

      return;
    }

    this.props.setAuth(null);

    if (!auth) {
      throw new Error("Cannot sign out because we are not signed in.");
    }
    const token: string = auth.accessToken;
    localStorage.clear();
    revokeGitHubAuth(this.rpc, token);
  };

  private handleUpdateGitHub = async (): Promise<void> => {
    try {
      this.setState({
        saving: true,
      });
      const song: Song | undefined = this.song();
      const { auth, edit } = this.props;
      if (!auth || !edit || !song || !this.rpc) {
        throw new Error("Invariant violation: contract broken");
      }
      const path: string = last(edit.split("/"));

      try {
        await doPublish(song.src, auth, path, this.rpc, true);
        const cleanSongs: { [key: string]: Song } = JSON.parse(
          JSON.stringify(this.state.cleanSongs),
        );
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

      if (!this.rpc) {
        throw new Error("Expected rpc to be defined");
      }

      await this.rpc.call("notifySaved", {});
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
  };

  private handleWindowResize = (): void => {
    this.setState({
      windowWidth: window.innerWidth,
    });
    if (this.state.mode === MODE_BOTH && window.innerWidth < MIN_BOTH_WIDTH) {
      this.setState({
        mode: MODE_VIEW,
      });
    }
    if (this.state.mode !== MODE_BOTH && window.innerWidth >= MIN_BOTH_WIDTH) {
      this.setState({
        mode: MODE_BOTH,
      });
    }
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
  };

  private handleWSOpen = async (): Promise<void> => {
    if (!this.socket) {
      throw new Error("Socket not opened, but handleWSOpen called.");
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
        auth.repoDetails = await getOrCreateRepo(auth);
        // Note: needs to be in this order, or saveAs will disappear.
        this.props.setAuth(auth);
        this.props.setQuery(
          {
            code: undefined,
            state: undefined,
          },
          true,
        );
      } catch (err) {
        alert(err.message || "Could not log you in");
        this.props.setQuery(
          {
            code: undefined,
            state: undefined,
          },
          true,
        );
      }
    } else if (this.props.auth) {
      try {
        const auth: Auth = { ...this.props.auth };
        auth.repoDetails = await getOrCreateRepo(auth);
        this.props.setAuth(auth);
      } catch (err) {
        alert(err.message || "Could not get GitHub repo details.");
      }
    }
    this.setState({
      reconnectCooloff: INITIAL_WS_COOLOFF,
    });
    this.forceUpdate();
  };

  private hasConflict(): boolean {
    const { dirtySongs, edit } = this.props;
    const { cleanSongs } = this.state;
    const songName: string = edit || "null";

    const dirtySong: Song | undefined = dirtySongs[songName];
    const cleanSong: Song | undefined = cleanSongs[songName];

    return dirtySong && cleanSong && dirtySong.baseSHA !== cleanSong.baseSHA;
  }

  private isDirty(): boolean {
    const { edit, dirtySongs, src } = this.props;

    if (src) {
      return false;
    }

    return dirtySongs[edit || "null"] !== undefined;
  }

  private isOnline(): boolean {
    return Boolean(this.rpc);
  }

  private renderModal(): React.ReactNode {
    const {
      locked,
      login,
      publish,
      interstitialChanges,
      saving,
      showMakelily,
      open,
    } = this.state;

    const { about, auth, csrf, setCSRF, "404": _404, saveAs } = this.props;

    const song: Song | undefined = this.song();
    const conflict: boolean = this.hasConflict();

    switch (true) {
      case locked:
        return <ModalLocked />;
      case _404 !== undefined:
        return <Modal404 onHide={this.handleClear404} />;
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
            key={location.href /* force new csrf on url change */}
            onHide={this.handleHideLogin}
            csrf={csrf}
            setCSRF={setCSRF}
          />
        );
      case Boolean(about):
        return <ModalAbout onHide={this.handleHideHelp} />;
      case publish || Boolean(saveAs):
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
        }

        return null;
      case interstitialChanges !== null:
        return (
          <ModalUnsavedChangesInterstitial
            discardChanges={this.discardChanges}
            cancel={this.cancelInterstitial}
            save={this.handleShowPublish}
          />
        );
      case open:
        return (
          <ModalOpen
            auth={auth}
            onSignIn={this.handleSignIn}
            onDeleteSong={this.handleDeleteSong}
            onLoadSong={this.handleLoadSong}
            onHide={this.handleHideOpen}
          />
        );
      case showMakelily !== null:
        if (showMakelily === null) {
          throw new Error("(this will never happen");
        }

        {
          const MakelilyComponent: typeof Makelily = showMakelily;

          return (
            <MakelilyComponent
              clef={this.state.makelilyClef}
              defaultTool={this.state.makelilyTool}
              keySig={this.state.makelilyKey}
              onHide={this.handleHideMakelily}
              singleTaskMode={this.state.makelilySingleTaskMode}
              onInsertLy={this.handleInsertLy}
              time={this.state.makelilyTime}
            />
          );
        }
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
          style={{
            width:
              mode === MODE_BOTH ? "50%" : mode === MODE_VIEW ? "100%" : "0",
          }}
        >
          <div className={css(APP_STYLE.sheetMusicError)}>
            Fetching sheet music&hellip;
          </div>
        </div>
      );
    }

    if (this.socket) {
      if (online && this.rpc) {
        return (
          <Preview
            code={song.src}
            mode={mode}
            onLogsObtained={this.handleLogsObtained}
            onMidiObtained={this.handleMidiObtained}
            onSelectionChanged={this.handleSelectionChanged}
            rpc={this.rpc}
            logs={logs}
          />
        );
      }

      const previewMaskStyle: string = css(
        APP_STYLE.pendingPreviewMask,
        mode === MODE_VIEW && APP_STYLE.previewPendingMaskModeView,
      );

      return (
        <span>
          <div
            className={css(APP_STYLE.sheetMusicView)}
            style={{
              width:
                mode === MODE_BOTH ? "50%" : mode === MODE_VIEW ? "100%" : "0",
            }}
          />
          <div className={previewMaskStyle} />
        </span>
      );
    }

    if (!BACKEND_WS_URL) {
      return (
        <div
          className={css(APP_STYLE.sheetMusicView)}
          style={{
            width:
              mode === MODE_BOTH ? "50%" : mode === MODE_VIEW ? "100%" : "0",
          }}
        >
          <div className={css(APP_STYLE.sheetMusicError)}>
            Could not connect to server because the{" "}
            <code>REACT_APP_BACKEND_WS_URL</code> environment variable was not
            set during bundling.
          </div>
        </div>
      );
    }

    if (wsError) {
      return (
        <div
          className={css(APP_STYLE.sheetMusicView)}
          style={{
            width:
              mode === MODE_BOTH ? "50%" : mode === MODE_VIEW ? "100%" : "0",
          }}
        >
          <div className={css(APP_STYLE.sheetMusicError)}>
            <Icon icon="warning-sign" /> Could not connect to server.
            <br />
            Trying again in {reconnectTimeout}
            &hellip;
          </div>
        </div>
      );
    }

    return null;
  }

  private setEditor = (editor: Editor | null): void => {
    this.editor = editor;
  };

  private setQueryOrShowInterstitial = <K extends keyof QueryProps>(
    updates: Pick<QueryProps, K>,
  ): void => {
    if (this.isDirty()) {
      this.setState({
        interstitialChanges: updates,
      });
    } else {
      this.props.setQuery(updates);
    }
  };

  private song(): Song | undefined {
    const { dirtySongs, edit, src } = this.props;

    if (src) {
      return {
        baseSHA: PUBLIC_READONLY,
        src,
      };
    }

    const { cleanSongs } = this.state;
    const songName: string = edit || "null";

    const song: Song | undefined = dirtySongs[songName] || cleanSongs[songName];
    if (!song) {
      return undefined;
    }

    return song;
  }

  private triggerDownload = (filename: string, src: string) => {
    const element = document.createElement("a");
    element.setAttribute("href", src);
    element.setAttribute("download", filename);

    element.style.display = "none";
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
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
