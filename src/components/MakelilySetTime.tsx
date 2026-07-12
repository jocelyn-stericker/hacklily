// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2017-present Jocelyn Stericker <jocelyn@nettek.ca>

import React from "react";

import type { Time } from "#/musicxml-interfaces";
import { TimeSymbolType } from "#/musicxml-interfaces";
import { Addons as SatieAddons } from "#/satie/src/satie";

import { cn } from "../lib/utils";
import makelilyStyles from "./makelilyStyles";
import type { MakelilyToolProps } from "./MakelilyToolProps";

interface LyTime {
  tsViewbox: string;
}

const stdTime: (Time & LyTime)[] = [
  {
    beatTypes: [4],
    beats: ["4"],
    symbol: TimeSymbolType.Common,
    tsViewbox: "-32 -45 80 80",
  },
  {
    beatTypes: [2],
    beats: ["2"],
    symbol: TimeSymbolType.Cut,
    tsViewbox: "-32 -45 80 80",
  },
  {
    beatTypes: [4],
    beats: ["2"],
    tsViewbox: "-32 -45 80 80",
  },
  {
    beatTypes: [4],
    beats: ["4"],
    tsViewbox: "-32 -45 80 80",
  },
  {
    beatTypes: [2],
    beats: ["2"],
    tsViewbox: "-32 -45 80 80",
  },
  {
    beatTypes: [4],
    beats: ["3"],
    tsViewbox: "-32 -45 80 80",
  },
  {
    beatTypes: [8],
    beats: ["6"],
    tsViewbox: "-32 -45 80 80",
  },
  {
    beatTypes: [8],
    beats: ["9"],
    tsViewbox: "-32 -45 80 80",
  },
  {
    beatTypes: [8],
    beats: ["12"],
    tsViewbox: "-26 -45 80 80",
  },
];

export interface State {
  selectedTime: number;
}

function getInitialState(props: MakelilyToolProps): State {
  let selectedTime: number = stdTime.findIndex(
    (time: Time) =>
      time.beatTypes[0] === props.time.beatTypes[0] &&
      time.beats[0] === props.time.beats[0],
  );

  if (selectedTime === -1) {
    selectedTime = -1;
  }

  return {
    selectedTime,
  };
}

/**
 * A tool which allows a time signature to be inserted.
 */
export default class ToolSetTime extends React.Component<
  MakelilyToolProps,
  State
> {
  state: State = getInitialState(this.props);

  render(): JSX.Element {
    const tsViews: JSX.Element[] = stdTime.map(
      (time: Time & LyTime, i: number) => {
        const timeSpec: Time & LyTime = {
          defaultX: 0,
          defaultY: 0,
          relativeY: 0,
          ...time,
        };

        const selected: boolean = i === this.state.selectedTime;
        const className: string = cn(
          makelilyStyles.selectableOption,
          selected && makelilyStyles.selectableSelected,
          makelilyStyles.paletteSml,
        );

        return (
          <span
            className={className}
            role="button"
            onClick={(): void => this.setState({ selectedTime: i })}
            key={i}
          >
            <svg
              className={cn(makelilyStyles.resetFont)}
              viewBox={timeSpec.tsViewbox}
            >
              <SatieAddons.TimeSignature spec={timeSpec} />
            </svg>
          </span>
        );
      },
    );

    return (
      <div className={cn(makelilyStyles.tool)}>
        <div className={cn(makelilyStyles.section)}>
          <h3 className={cn(makelilyStyles.toolHeading)}>Time Signature</h3>
          <div className={cn(makelilyStyles.selectableList)}>{tsViews}</div>
        </div>
        <div className={cn(makelilyStyles.spacer)} />
        <div className={cn(makelilyStyles.section)}>
          <pre className={cn(makelilyStyles.lyPreview)}>
            {this.generateLy()}
          </pre>

          <button
            className={cn(makelilyStyles.insert)}
            onClick={this.handleInsertLyClicked}
          >
            Insert this code into Hacklily
          </button>
        </div>
      </div>
    );
  }

  private generateLy(): string {
    const time: Time = stdTime[this.state.selectedTime];
    const isNumeric: boolean = time.symbol == null;

    return `${isNumeric ? "\\numericTimeSignature" : "\\defaultTimeSignature"}
\\time ${time.beats[0]}/${time.beatTypes[0]}`;
  }

  private handleInsertLyClicked = (): void => {
    this.props.onInsertLy(this.generateLy());
  };
}
