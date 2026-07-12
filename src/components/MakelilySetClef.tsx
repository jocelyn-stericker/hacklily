// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2017-present Jocelyn Stericker <jocelyn@nettek.ca>

import React from "react";

import type { Clef } from "#/musicxml-interfaces";
import { Addons as SatieAddons } from "#/satie/src/satie";

import { cn } from "../lib/utils";
import makelilyStyles from "./makelilyStyles";
import type { MakelilyToolProps } from "./MakelilyToolProps";

interface LyClef {
  clefViewbox: string;
  enName: string;
  lyName: string;
}

const stdClefs: (Clef & LyClef)[] = [
  {
    clefViewbox: "-26 -47 80 114",
    enName: "Treble",
    line: 2,
    lyName: "treble",
    sign: "G",
  },
  {
    clefViewbox: "-26 -47 80 114",
    enName: "Bass",
    line: 4,
    lyName: "bass",
    sign: "F",
  },
  {
    clefViewbox: "-26 -47 80 114",
    enName: "Alto",
    line: 3,
    lyName: "alto",
    sign: "C",
  },
  {
    clefViewbox: "-26 -47 80 114",
    enName: "Tenor",
    line: 4,
    lyName: "tenor",
    sign: "C",
  },
  {
    clefViewbox: "-32 -47 80 114",
    enName: "Guitar Tab",
    line: 5,
    lyName: "moderntab",
    sign: "TAB",
  },
  {
    clefViewbox: "-32 -47 80 114",
    enName: "Perc.",
    line: 3,
    lyName: "percussion",
    sign: "percussion",
  },
];

export interface State {
  octave: number;
  octaveOptional: boolean;
  selectedClef: number;
}

function getInitialState(props: MakelilyToolProps): State {
  let selectedClef: number = stdClefs.findIndex(
    (clef: Clef) =>
      clef.line === props.clef.line && clef.sign === props.clef.sign,
  );

  if (selectedClef === -1) {
    selectedClef = 0;
  }

  return {
    octave: parseInt(props.clef.clefOctaveChange, 10) || 0,
    octaveOptional: false,
    selectedClef,
  };
}

/**
 * A tool which allows clefs to be inserted.
 */
export default class ToolSetClef extends React.Component<
  MakelilyToolProps,
  State
> {
  state: State = getInitialState(this.props);

  render(): JSX.Element {
    const clefViews: JSX.Element[] = stdClefs.map(
      (clef: Clef & LyClef, i: number) => {
        const clefSpec: Clef & LyClef = {
          defaultX: 0,
          defaultY: 0,
          relativeY: 0,
          ...clef,
          clefOctaveChange:
            clef.sign !== "TAB" &&
            clef.sign !== "percussion" &&
            `${this.state.octave}`,
        };

        const selected: boolean = i === this.state.selectedClef;

        return (
          <span
            className={cn(
              makelilyStyles.selectableOption,
              selected && makelilyStyles.selectableSelected,
            )}
            role="button"
            onClick={(): void => this.setState({ selectedClef: i })}
            key={i}
          >
            <svg
              className={cn(makelilyStyles.resetFont)}
              viewBox={clefSpec.clefViewbox}
            >
              <SatieAddons.Clef spec={clefSpec} />
            </svg>
            <span className={cn(makelilyStyles.selectableDescription)}>
              {clefSpec.enName}
            </span>
          </span>
        );
      },
    );

    const clefSign: string = stdClefs[this.state.selectedClef].sign;
    const canChangeOctave: boolean =
      clefSign !== "TAB" && clefSign !== "percussion";

    return (
      <div className={cn(makelilyStyles.tool)}>
        <div className={cn(makelilyStyles.section)}>
          <h3 className={cn(makelilyStyles.toolHeading)}>Clef</h3>
          <div className={cn(makelilyStyles.selectableList)}>{clefViews}</div>
        </div>
        <div className={cn(makelilyStyles.section)}>
          <h3 className={cn(makelilyStyles.toolHeading)}>Octave</h3>
          <form className={cn(makelilyStyles.radioGroup)}>
            <div>
              <input
                id="set-clef-15va"
                type="radio"
                checked={this.state.octave === 2}
                aria-checked={this.state.octave === 2}
                onChange={(): void => this.setState({ octave: 2 })}
              />{" "}
              <label htmlFor="set-clef-15va">
                Play two octaves higher than written (15va)
              </label>
            </div>
            <div>
              <input
                id="set-clef-8va"
                type="radio"
                checked={this.state.octave === 1}
                disabled={!canChangeOctave}
                aria-checked={this.state.octave === 1}
                onChange={(): void => this.setState({ octave: 1 })}
              />{" "}
              <label htmlFor="set-clef-8va">
                Play an octave higher than written (8va)
              </label>
            </div>
            <div>
              <input
                id="set-clef-0v"
                type="radio"
                checked={this.state.octave === 0}
                disabled={!canChangeOctave}
                aria-checked={this.state.octave === 0}
                onChange={(): void => this.setState({ octave: 0 })}
              />{" "}
              <label htmlFor="set-clef-0v">
                <strong>Play in standard octave.</strong>
              </label>
            </div>
            <div>
              <input
                id="set-clef-8vb"
                type="radio"
                checked={this.state.octave === -1}
                disabled={!canChangeOctave}
                aria-checked={this.state.octave === -1}
                onChange={(): void => this.setState({ octave: -1 })}
              />{" "}
              <label htmlFor="set-clef-8vb">
                Play an octave lower than written (8vb)
              </label>
            </div>
            <div>
              <input
                id="set-clef-15vb"
                type="radio"
                checked={this.state.octave === -2}
                disabled={!canChangeOctave}
                aria-checked={this.state.octave === -2}
                onChange={(): void => this.setState({ octave: -2 })}
              />{" "}
              <label htmlFor="set-clef-15vb">
                Play two octaves lower than written (15vb)
              </label>
            </div>
            <div style={{ marginTop: 12 }}>
              <input
                id="clef-octave-optional"
                type="checkbox"
                disabled={this.state.octave === 0 || !canChangeOctave}
                checked={this.state.octaveOptional}
                aria-checked={this.state.octaveOptional}
                onChange={(): void =>
                  this.setState({ octaveOptional: !this.state.octaveOptional })
                }
              />{" "}
              <label htmlFor="clef-octave-optional">
                Octave change is optional (in parentheses)
              </label>
            </div>
          </form>
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
    const clef: string = stdClefs[this.state.selectedClef].lyName;
    if (
      clef === "moderntab" ||
      clef === "percussion" ||
      this.state.octave === 0
    ) {
      return `\\clef ${clef}`;
    }

    const openOctave: string = this.state.octaveOptional ? "(" : "";
    const closeOctave: string = this.state.octaveOptional ? ")" : "";
    switch (this.state.octave) {
      case -2:
        return `\\clef "${clef}_${openOctave}15${closeOctave}"`;
      case -1:
        return `\\clef "${clef}_${openOctave}8${closeOctave}"`;
      case 1:
        return `\\clef "${clef}^${openOctave}8${closeOctave}"`;
      case 2:
        return `\\clef "${clef}^${openOctave}15${closeOctave}"`;
      default:
        return "Error: unknown octave";
    }
  }

  private handleInsertLyClicked = (): void => {
    this.props.onInsertLy(this.generateLy());
  };
}
