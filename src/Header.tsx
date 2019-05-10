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

import { Popover, Spinner } from "@blueprintjs/core";
import { css, StyleSheet } from "aphrodite";
import React from "react";

import * as logoSvg from "./logo.svg";

import { Auth } from "./auth";
import ButtonGroup, { ButtonSpec } from "./ButtonGroup";
import Menu from "./Menu";
import { BUTTON_STYLE } from "./styles";

export type ViewMode = "view" | "edit" | "both";
export const MODE_VIEW: ViewMode = "view";
export const MODE_BOTH: ViewMode = "both";
export const MODE_EDIT: ViewMode = "edit";
export const MIN_BOTH_WIDTH: number = 630;

interface Player {
  // TODO(joshuan): Export hackmidi types :(
  addChangeListener(
    fn: (timeInSeconds: number, isPlaying: boolean) => void,
  ): void;
  destroy(): void;
  getDuration(): number;
  pause(): void;
  play(): void;
  removeChangeListener(
    fn: (timeInSeconds: number, isPlaying: boolean) => void,
  ): void;
  seek(time: number): void;
}

interface Props {
  auth: Auth | null;
  colourScheme: "vs-dark" | "vs";
  inSandbox: boolean;
  isDirty: boolean;
  isImmutableSrc: boolean;
  loggedIn: boolean;
  midi: ArrayBuffer | null;
  mode: ViewMode;
  online: boolean;
  sandboxIsDirty: boolean;
  song: string | undefined;
  windowWidth: number;
  onModeChanged(mode: ViewMode): void;
  onShowClone(): void;
  onShowMakelily(): void;
  onShowNew(): void;
  onShowPublish(): void;
  onDeleteSong(song: string): void;
  onLoadSong(song: string): void;
  onShowAbout(): void;
  onSignIn(): void;
  onSignOut(): void;
  setColourScheme(colourScheme: "vs-dark" | "vs"): void;
}

interface State {
  // The interface changes after we've played once.
  played: boolean;
  player: Player | null;
  playing: boolean;
  timeInSeconds: number;
}

function last<T>(t: T[]): T {
  return t[t.length - 1];
}

/**
 * Renders the top of the app.
 */
export default class Header extends React.PureComponent<Props> {
  state: State = {
    played: false,
    player: null,
    playing: false,
    timeInSeconds: 0,
  };

  componentWillReceiveProps(props: Props): void {
    if (props.midi !== this.props.midi && this.state.player) {
      const player: Player = this.state.player;
      this.setState(
        {
          player: null,
          playing: false,
        },
        () => {
          player.destroy();
        },
      );
    }
  }

  // tslint:disable-next-line:max-func-body-length
  render(): JSX.Element {
    const {
      auth,
      colourScheme,
      onDeleteSong,
      onSignIn,
      onSignOut,
      onLoadSong,
      onShowAbout,
      mode,
      loggedIn,
      onModeChanged,
      windowWidth,
      setColourScheme,
    } = this.props;
    const { played, playing } = this.state;

    const menuContents = (
      <Menu
        auth={auth}
        colourScheme={colourScheme}
        windowWidth={windowWidth}
        onDeleteSong={onDeleteSong}
        onShowAbout={onShowAbout}
        onSignIn={onSignIn}
        onSignOut={onSignOut}
        onLoadSong={onLoadSong}
        setColourScheme={setColourScheme}
      />
    );

    const modeButtons: ButtonSpec[] = [];
    if (windowWidth < MIN_BOTH_WIDTH) {
      modeButtons.push({
        content: (
          <i
            aria-hidden={true}
            className={`fa fa-eye ${css(styles.modeItem)}`}
          />
        ),
        title: "View",
        value: MODE_VIEW,
      });
      modeButtons.push({
        content: (
          <i
            aria-hidden={true}
            className={`fa fa-pencil ${css(styles.modeItem)}`}
          />
        ),
        title: "Edit",
        value: MODE_EDIT,
      });
    }

    const viewMode: React.ReactNode = modeButtons.length > 0 && (
      <div className={css(styles.headerGroupWrapper, styles.miniGroup)}>
        <ButtonGroup
          value={mode}
          buttons={modeButtons}
          onChange={onModeChanged}
        />
      </div>
    );

    const playButton: React.ReactNode = (
      <div className={css(styles.headerGroupWrapper, styles.miniGroup)}>
        <button
          title={playing ? "Pause" : "Play"}
          className={css(BUTTON_STYLE.buttonStyle, styles.playButton)}
          onClick={playing ? this.handlePause : this.handlePlay}
        >
          <i className={playing ? "fa-pause fa" : "fa-play fa"} />
        </button>
      </div>
    );

    const makelilyButton: React.ReactNode = (
      <div className={css(styles.headerGroupWrapper, styles.miniGroup)}>
        <button
          title="Lilypond Tools"
          className={css(BUTTON_STYLE.buttonStyle, styles.playButton)}
          onClick={this.handleShowMakelily}
        >
          <i className="fa-briefcase fa" /> Tools
        </button>
      </div>
    );

    const communityToolbar: React.ReactNode = this.renderCommunityToolbar();
    let menu: React.ReactNode = null;
    if (windowWidth >= MIN_BOTH_WIDTH) {
      menu = (
        <div className={css(styles.headerGroupWrapper, styles.songs)}>
          <Popover content={menuContents}>
            <button
              title="Menu"
              className={css(BUTTON_STYLE.buttonStyle, styles.songsText)}
            >
              {!loggedIn && <span>Hacklily &mdash; </span>}
              {this.props.song
                ? last(this.props.song.split("/")).split(".ly")[0]
                : "untitled"}
              {this.props.isDirty ? "*" : ""}{" "}
              <span className={css(styles.srOnly)}>
                : an online LilyPond editor
              </span>
              <i className="fa fa-chevron-down" aria-hidden={true} />
            </button>
          </Popover>
        </div>
      );
    } else {
      menu = (
        <div className={css(styles.headerGroupWrapper, styles.songs)}>
          <Popover content={menuContents}>
            <button
              title="Menu"
              className={css(BUTTON_STYLE.buttonStyle, styles.songsText)}
            >
              <i className="fa-bars fa" /> Menu
            </button>
          </Popover>
        </div>
      );
    }

    return (
      <div className="header">
        <img
          src={logoSvg}
          className={css(styles.logo)}
          alt="Frog, Hacklily logo"
        />
        {menu || <span style={{ width: 10 }} />}
        {viewMode}
        {makelilyButton}
        {played ? this.renderTime() : playButton}
        <div className={css(styles.headerSpacer)} />
        {communityToolbar}
      </div>
    );
  }
  private handleFastForward = (): void => {
    if (!this.state.player) {
      return;
    }
    this.state.player.seek(this.state.timeInSeconds + 4);
  };
  private handlePause = async (): Promise<void> => {
    this.setState({
      playing: false,
    });

    const { player } = this.state;

    if (player) {
      player.pause();
    }
  };

  private handlePlay = async (): Promise<void> => {
    if (!this.props.midi) {
      alert(
        "No MIDI data found. Make sure you have " +
          "a \\midi {} and a \\layout {} in your \\score {}.",
      );

      return;
    }

    let player: Player;
    if (this.state.player) {
      player = this.state.player;
    } else {
      const { playerFromMIDIBuffer } = await import("hackmidi");

      player = await playerFromMIDIBuffer(
        this.props.midi,
        "https://www.hacklily.org/hackmidi/samples/",
      );
      this.setState({
        player,
      });
      player.addChangeListener(this.handlePlaying);
    }

    player.play();
    this.setState({
      played: true,
      playing: true,
    });
  };

  private handlePlaying = (timeInSeconds: number, playing: boolean): void => {
    const wasPlaying: boolean = this.state.playing;
    this.setState({
      playing,
      timeInSeconds,
    });

    const player: Player | null = this.state.player;
    if (!player) {
      // TODO(joshuan): Fix this!
      // tslint:disable-next-line no-console
      console.log("handlePlaying called, but there's no song");

      return;
    }

    if (wasPlaying && !playing && timeInSeconds === 0) {
      // TODO(joshuan): Convince timidity to not cleanup at end. Then, get rid of this.
      this.setState(
        {
          player: null,
        },
        () => {
          setTimeout(() => {
            player.destroy();
          }, 0);
        },
      );
    }
  };

  private handleRewind = (): void => {
    if (!this.state.player) {
      return;
    }
    this.state.player.seek(Math.max(0, this.state.timeInSeconds - 4));
  };

  private handleShowMakelily = (): void => {
    this.props.onShowMakelily();
  };

  // tslint:disable-next-line:cyclomatic-complexity
  private renderCommunityToolbar(): React.ReactNode {
    const {
      online,
      song,
      onShowClone,
      onShowNew,
      onShowPublish,
      isDirty,
      windowWidth,
      sandboxIsDirty,
      inSandbox,
      isImmutableSrc,
    } = this.props;
    const micro: boolean = windowWidth <= 750;

    const goToSandbox: string = sandboxIsDirty
      ? "Back to scratchpad"
      : "New song";
    let saveAsButton: React.ReactNode;
    if (!inSandbox) {
      saveAsButton = (
        <button
          title="Save As"
          className={css(styles.newSong)}
          onClick={onShowClone}
        >
          <i className="fa fa-clone" />{" "}
          {!micro && !isImmutableSrc && <span>Save As</span>}
          {!micro && isImmutableSrc && <span>Import</span>}
        </button>
      );
    }

    let saveShare: React.ReactNode;
    if (song) {
      if (isDirty) {
        saveShare = (
          <span>
            <i className="fa fa-save" /> {!micro && <span>Save updates</span>}
          </span>
        );
      } else if (!micro) {
        saveShare = "All changes saved.";
      }
    } else {
      saveShare = (
        <span>
          <i className="fa fa-save" /> {!micro && <span>Save / share</span>}
        </span>
      );
    }

    if (!isDirty && !this.props.song) {
      return (
        <div className={css(styles.headerGroupWrapper)}>
          <button title="Publish" className={css(styles.newSong)}>
            {!micro && <span>No changes made.</span>}
          </button>
        </div>
      );
    }

    if (online) {
      return (
        <div className={css(styles.headerGroupWrapper)}>
          <button
            title="Publish"
            className={css(styles.newSong)}
            onClick={onShowNew}
          >
            <i
              className={`fa ${sandboxIsDirty ? "fa-chevron-left" : "fa-plus"}`}
            />{" "}
            {!micro && <span>{goToSandbox}</span>}
          </button>
          {saveAsButton}
          <button
            title="Publish"
            className={css(styles.publish, isDirty && styles.publishActive)}
            onClick={isDirty || !song ? onShowPublish : undefined}
          >
            {saveShare}
          </button>
        </div>
      );
    }

    return (
      <div className={css(styles.headerGroupWrapper)}>
        <Spinner size={Spinner.SIZE_SMALL} className={css(styles.spinner)} />
      </div>
    );
  }

  private renderTime(): React.ReactNode {
    const { timeInSeconds } = this.state;
    const fmtTime: string = String(Math.floor(timeInSeconds * 100) / 100);
    const { playing } = this.state;

    return (
      <div className={css(styles.headerGroupWrapper, styles.miniGroup)}>
        <button
          title="Rewind"
          className={css(BUTTON_STYLE.buttonStyle, styles.playButton)}
          onClick={this.handleRewind}
        >
          <i className="fa-backward fa" />
        </button>
        <button
          title={playing ? "Pause" : "Play"}
          className={css(BUTTON_STYLE.buttonStyle, styles.playButton)}
          onClick={playing ? this.handlePause : this.handlePlay}
        >
          <i className={playing ? "fa-pause fa" : "fa-play fa"} />
        </button>
        <button
          className={css(
            BUTTON_STYLE.buttonStyle,
            styles.playButton,
            styles.playTime,
          )}
          disabled={true}
        >
          {fmtTime}
        </button>
        <button
          title="Fast-forward"
          className={css(BUTTON_STYLE.buttonStyle, styles.playButton)}
          onClick={this.handleFastForward}
        >
          <i className="fa-forward fa" />
        </button>
      </div>
    );
  }
}

const styles = StyleSheet.create({
  headerGroupWrapper: {
    display: "flex",
    marginBottom: "auto",
    marginTop: "auto",
  },
  headerSpacer: {
    flex: 1,
  },
  logo: {
    marginLeft: 16,
    padding: "9px 0",
    transform: "scale(-1, 1)",
    width: 32,
  },
  miniGroup: {
    marginLeft: 16,
  },
  modeItem: {
    fontSize: 14,
    paddingBottom: 5,
    paddingTop: 5,
    width: 14,
  },
  newSong: {
    ":hover": {
      color: "black",
    },
    color: "#aeaeae",
    fontSize: 14,
    marginRight: 32,
    textDecoration: "none",
  },
  playButton: {
    ":hover": {
      backgroundColor: "#ccc",
    },
    color: "#6e6e6e",
    display: "inline-block",
    fontSize: 14,
    height: 36,
    padding: 9,
  },
  playTime: {
    textAlign: "left",
    width: 80,
  },
  publish: {
    color: "#aeaeae",
    cursor: "unset",
    fontSize: 14,
    marginRight: 16,
    textDecoration: "none",
  },
  publishActive: {
    ":hover": {
      color: "black",
    },
    cursor: "pointer",
  },
  songs: {
    marginLeft: 16,
  },
  songsText: {
    ":hover": {
      backgroundColor: "#ccc",
    },
    color: "#6e6e6e",
    display: "inline-block",
    fontSize: 14,
    padding: 9,
  },
  srOnly: {
    border: 0,
    clip: "rect(0,0,0,0)",
    height: 1,
    margin: -1,
    overflow: "hidden",
    padding: 0,
    position: "absolute",
    width: 1,
  },
  spinner: {
    marginRight: 16,
  },
});
