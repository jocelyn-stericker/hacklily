// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2017-present Jocelyn Stericker <jocelyn@nettek.ca>

import {
  Play,
  Pause,
  File as FileIcon,
  PenLine,
  Eye,
  Music,
  Rewind,
  FastForward,
  ChevronDown,
} from "lucide-react";
import React from "react";

import FileMenu from "#/components/FileMenu";
import { Button } from "#/components/ui/button";
import { ButtonGroup } from "#/components/ui/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { Separator } from "#/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "#/components/ui/tooltip";
import { track } from "#/lib/analytics";
import type { Auth } from "#/lib/auth";
import { cn } from "#/lib/utils";

import logoSvg from "./logo.svg";

export type ViewMode = "view" | "edit" | "both";
export const MODE_VIEW: ViewMode = "view";
export const MODE_BOTH: ViewMode = "both";
export const MODE_EDIT: ViewMode = "edit";
export const MIN_BOTH_WIDTH = 630;
export const MIN_REASONABLE_WIDTH = 470;

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

  // eslint-disable-next-line react/no-unsafe
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
      songURL,
      windowWidth,
    } = this.props;
    const { played, playing } = this.state;

    const viewMode = windowWidth < MIN_BOTH_WIDTH && (
      <React.Fragment>
        <Button
          onClick={this.handleSetView}
          variant={mode === MODE_VIEW ? "default" : "outline"}
          size="icon"
        >
          <Eye size="1em" className="inline" />
        </Button>
        <Button
          onClick={this.handleSetEdit}
          variant={mode === MODE_EDIT ? "default" : "outline"}
          size="icon"
        >
          <PenLine size="1em" className="inline" />
        </Button>
      </React.Fragment>
    );

    let playButton: React.ReactNode = (
      <Button
        onClick={playing ? this.handlePause : this.handlePlay}
        variant="outline"
        disabled={!midi}
      >
        {playing ? (
          <Pause size="1em" className="inline" />
        ) : (
          <Play size="1em" className="inline" />
        )}
        {playing ? "Pause" : "Play"}
      </Button>
    );

    if (!midi) {
      playButton = (
        <Tooltip>
          <TooltipTrigger render={playButton} />
          <TooltipContent side="top">
            {
              "No MIDI data found. Make sure you have a \\midi {} and a \\layout {} in your \\score {}."
            }
          </TooltipContent>
        </Tooltip>
      );
    }

    return (
      <header className="header flex h-12 items-center gap-4 border-b px-4">
        <div className="flex items-center align gap-2">
          {windowWidth >= MIN_REASONABLE_WIDTH && (
            <img
              src={logoSvg}
              className="mr-4 py-2.25 scale-x-[-1] w-8"
              alt=""
            />
          )}
          {windowWidth >= MIN_BOTH_WIDTH && (
            <div className="text-[16px] -ml-2 mr-3.75">Hacklily</div>
          )}
          {windowWidth >= MIN_BOTH_WIDTH && (
            <Separator orientation="vertical" className="h-6 self-center!" />
          )}
          <ButtonGroup>
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" />}>
                <FileIcon size="1em" className="inline" />
                {windowWidth >= MIN_REASONABLE_WIDTH && <span>File</span>}
                <ChevronDown size="1em" className="inline" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="min-w-48">
                <FileMenu
                  auth={auth}
                  canCreateNew={online}
                  canSave={online && !readOnly}
                  canSaveAs={online && !inSandbox}
                  canExport={canExport}
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
                  songURL={songURL}
                />
              </DropdownMenuContent>
            </DropdownMenu>
            {windowWidth >= MIN_BOTH_WIDTH && (
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="outline" />}>
                  <PenLine size="1em" className="inline" />
                  Insert
                  <ChevronDown size="1em" className="inline" />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="min-w-48">
                  <DropdownMenuItem onClick={this.handleShowClef}>
                    Clef&hellip;
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={this.handleShowKey}>
                    Key Signature&hellip;
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={this.handleShowTime}>
                    Time Signature&hellip;
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={this.handleShowNotes}>
                    <Music size="1em" className="inline" />
                    Notes&hellip;
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {viewMode}
            {played && midi != null ? this.renderTime() : playButton}
          </ButtonGroup>
        </div>
      </header>
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

    track("midi-playback");
    let player: Player;
    if (this.state.player) {
      player = this.state.player;
    } else {
      const { playerFromMIDIBuffer } = await import("hackmidi");

      player = await playerFromMIDIBuffer(
        this.props.midi,
        "/hackmidi/samples/",
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
    let fmtTime = String(Math.floor(timeInSeconds * 100) / 100);
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
          variant="outline"
          size="icon"
          onClick={this.handleRewind}
        >
          <Rewind size="1em" className="inline" />
        </Button>
        <Button
          title={playing ? "Pause" : "Play"}
          variant="outline"
          size="icon"
          onClick={playing ? this.handlePause : this.handlePlay}
        >
          {playing ? (
            <Pause size="1em" className="inline" />
          ) : (
            <Play size="1em" className="inline" />
          )}
        </Button>
        {windowWidth >= MIN_REASONABLE_WIDTH && (
          <Button
            className={cn("text-left w-20 justify-end", "font-mono")}
            variant="outline"
            disabled={true}
          >
            {fmtTime}
          </Button>
        )}
        <Button
          variant="outline"
          size="icon"
          title="Fast-forward"
          onClick={this.handleFastForward}
        >
          <FastForward size="1em" className="inline" />
        </Button>
      </React.Fragment>
    );
  }
}
