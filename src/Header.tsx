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

import {
  Alignment,
  Button,
  ButtonGroup,
  Classes,
  Menu,
  MenuItem,
  Navbar,
  NavbarDivider,
  NavbarGroup,
  Popover,
  Tooltip,
} from "@blueprintjs/core";
import { css, StyleSheet } from "aphrodite";
import React from "react";

import * as logoSvg from "./logo.svg";

import { Auth } from "./auth";
import FileMenu from "./FileMenu";

export type ViewMode = "view" | "edit" | "both";
export const MODE_VIEW: ViewMode = "view";
export const MODE_BOTH: ViewMode = "both";
export const MODE_EDIT: ViewMode = "edit";
export const MIN_BOTH_WIDTH: number = 630;
export const MIN_REASONABLE_WIDTH: number = 470;

interface Player {
  // TODO(jocelyn): Export hackmidi types :(
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
  canExport: boolean;
  colourScheme: "vs-dark" | "vs";
  inSandbox: boolean;
  isDirty: boolean;
  readOnly: boolean;
  loggedIn: boolean;
  midi: ArrayBuffer | null;
  mode: ViewMode;
  online: boolean;
  sandboxIsDirty: boolean;
  song: string | undefined;
  windowWidth: number;
  songURL: string | null;
  onModeChanged(mode: ViewMode): void;
  onShowClone(): void;
  onShowMakelily(tool: string): void;
  onShowNew(): void;
  onShowOpen(): void;
  onExportLy(): any;
  onExportMIDI(): any;
  onExportPDF(): any;
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

  UNSAFE_componentWillReceiveProps(props: Props): void {
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

  render(): JSX.Element {
    const {
      auth,
      canExport,
      colourScheme,
      readOnly,
      inSandbox,
      mode,
      midi,
      onDeleteSong,
      onExportLy,
      onExportMIDI,
      onExportPDF,
      onLoadSong,
      onShowAbout,
      onShowClone,
      onShowOpen,
      onShowNew,
      onShowPublish,
      onSignIn,
      onSignOut,
      online,
      setColourScheme,
      songURL,
      windowWidth,
    } = this.props;
    const { played, playing } = this.state;

    const viewMode = windowWidth < MIN_BOTH_WIDTH && (
      <React.Fragment>
        <Button
          onClick={this.handleSetView}
          active={mode === MODE_VIEW}
          icon="eye-open"
        />
        <Button
          onClick={this.handleSetEdit}
          active={mode === MODE_EDIT}
          icon="edit"
        />
      </React.Fragment>
    );

    let playButton: React.ReactNode = (
      <Button
        onClick={playing ? this.handlePause : this.handlePlay}
        icon={playing ? "pause" : "play"}
        disabled={!midi}
      >
        {playing ? "Pause" : "Play"}
      </Button>
    );

    if (!midi) {
      playButton = (
        <Tooltip
          content={
            "No MIDI data found. Make sure you have " +
            "a \\midi {} and a \\layout {} in your \\score {}."
          }
        >
          {playButton}
        </Tooltip>
      );
    }

    return (
      <Navbar>
        <NavbarGroup align={Alignment.LEFT}>
          {windowWidth >= MIN_REASONABLE_WIDTH && (
            <img src={logoSvg} className={css(styles.logo)} alt="" />
          )}
          {windowWidth >= MIN_BOTH_WIDTH && (
            <div className={Classes.NAVBAR_HEADING}>Hacklily</div>
          )}
          {windowWidth >= MIN_BOTH_WIDTH && <NavbarDivider />}
          <ButtonGroup>
            <Popover
              content={
                <FileMenu
                  auth={auth}
                  canCreateNew={online}
                  canSave={online && !readOnly}
                  canSaveAs={online && !inSandbox}
                  canExport={canExport}
                  colourScheme={colourScheme}
                  onDeleteSong={onDeleteSong}
                  onExportLy={onExportLy}
                  onExportMIDI={onExportMIDI}
                  onExportPDF={onExportPDF}
                  onLoadSong={onLoadSong}
                  onShowAbout={onShowAbout}
                  onShowClone={onShowClone}
                  onShowOpen={onShowOpen}
                  onShowPublish={onShowPublish}
                  onShowNew={onShowNew}
                  onSignIn={onSignIn}
                  onSignOut={onSignOut}
                  setColourScheme={setColourScheme}
                  songURL={songURL}
                />
              }
              autoFocus={false}
            >
              <Button icon="document" rightIcon="caret-down">
                {windowWidth >= MIN_REASONABLE_WIDTH && <span>File</span>}
              </Button>
            </Popover>
            {windowWidth >= MIN_BOTH_WIDTH && (
              <Popover
                content={
                  <Menu>
                    <MenuItem
                      icon="blank"
                      text="Clef&hellip;"
                      onClick={this.handleShowClef}
                    />
                    <MenuItem
                      icon="blank"
                      text="Key Signature&hellip;"
                      onClick={this.handleShowKey}
                    />
                    <MenuItem
                      icon="blank"
                      text="Time Signature&hellip;"
                      onClick={this.handleShowTime}
                    />
                    <MenuItem
                      icon="music"
                      text="Notes&hellip;"
                      onClick={this.handleShowNotes}
                    />
                  </Menu>
                }
                autoFocus={false}
              >
                <Button icon="draw" rightIcon="caret-down">
                  Insert
                </Button>
              </Popover>
            )}
            {viewMode}
            {played && midi != null ? this.renderTime() : playButton}
          </ButtonGroup>
        </NavbarGroup>
      </Navbar>
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
      // TODO(jocelyn): Fix this!
      console.log("handlePlaying called, but there's no song");

      return;
    }

    if (wasPlaying && !playing && timeInSeconds === 0) {
      // TODO(jocelyn): Convince timidity to not cleanup at end. Then, get rid of this.
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

  private handleSetView = (): void => {
    this.props.onModeChanged(MODE_VIEW);
  };

  private handleSetEdit = (): void => {
    this.props.onModeChanged(MODE_EDIT);
  };

  private handleRewind = (): void => {
    if (!this.state.player) {
      return;
    }
    this.state.player.seek(Math.max(0, this.state.timeInSeconds - 4));
  };

  private handleShowClef = (): void => {
    this.props.onShowMakelily("clef");
  };

  private handleShowKey = (): void => {
    this.props.onShowMakelily("key");
  };

  private handleShowTime = (): void => {
    this.props.onShowMakelily("time");
  };

  private handleShowNotes = (): void => {
    this.props.onShowMakelily("notes");
  };

  private renderTime(): React.ReactNode {
    const { playing, timeInSeconds } = this.state;
    const { windowWidth } = this.props;
    let fmtTime: string = String(Math.floor(timeInSeconds * 100) / 100);
    if (fmtTime.split(".")[1] == null) {
      fmtTime += ".00";
    }
    while (fmtTime.split(".")[1].length < 2) {
      fmtTime += "0";
    }

    return (
      <React.Fragment>
        <Button
          title="Rewind"
          icon="fast-backward"
          onClick={this.handleRewind}
        />
        <Button
          title={playing ? "Pause" : "Play"}
          onClick={playing ? this.handlePause : this.handlePlay}
          icon={playing ? "pause" : "play"}
        />
        {windowWidth >= MIN_REASONABLE_WIDTH && (
          <Button
            className={css(styles.playTime) + " " + Classes.MONOSPACE_TEXT}
            disabled={true}
          >
            {fmtTime}
          </Button>
        )}
        <Button
          icon="fast-forward"
          title="Fast-forward"
          onClick={this.handleFastForward}
        />
      </React.Fragment>
    );
  }
}

const styles = StyleSheet.create({
  logo: {
    marginRight: 16,
    padding: "9px 0",
    transform: "scale(-1, 1)",
    width: 32,
  },
  playTime: {
    textAlign: "left",
    width: 80,
    justifyContent: "flex-end",
  },
});
