/**
 * @license
 * This file is part of Makelily.
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
import { Time, TimeSymbolType } from 'musicxml-interfaces';
import React = require('react');
import { Addons as SatieAddons } from './satie/src/satie';

import tabStyles from './tabStyles';
import { ToolProps } from './tool';

interface LyTime {
  tsViewbox: string;
}

const stdTime: (Time & LyTime)[] = [
  {
    beatTypes: [4],
    beats: ['4'],
    symbol: TimeSymbolType.Common,
    tsViewbox: '-32 -45 80 80',
  },
  {
    beatTypes: [2],
    beats: ['2'],
    symbol: TimeSymbolType.Cut,
    tsViewbox: '-32 -45 80 80',
  },
  {
    beatTypes: [4],
    beats: ['2'],
    tsViewbox: '-32 -45 80 80',
  },
  {
    beatTypes: [4],
    beats: ['4'],
    tsViewbox: '-32 -45 80 80',
  },
  {
    beatTypes: [2],
    beats: ['2'],
    tsViewbox: '-32 -45 80 80',
  },
  {
    beatTypes: [4],
    beats: ['3'],
    tsViewbox: '-32 -45 80 80',
  },
  {
    beatTypes: [8],
    beats: ['6'],
    tsViewbox: '-32 -45 80 80',
  },
  {
    beatTypes: [8],
    beats: ['9'],
    tsViewbox: '-32 -45 80 80',
  },
  {
    beatTypes: [8],
    beats: ['12'],
    tsViewbox: '-26 -45 80 80',
  },

];

export interface State {
  selectedTime: number;
}

function getInitialState(props: ToolProps): State {
  let selectedTime: number = stdTime.findIndex((time: Time) =>
    time.beatTypes[0] === props.time.beatTypes[0] &&
    time.beats[0] === props.time.beats[0]);

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
export default class ToolSetTime extends React.Component<ToolProps, State> {
  state: State = getInitialState(this.props);

  // tslint:disable-next-line max-func-body-length
  render(): JSX.Element {
    const tsViews: JSX.Element[] = stdTime.map((time: Time & LyTime, i: number) => {
      const timeSpec: Time & LyTime = {
        defaultX: 0,
        defaultY: 0,
        relativeY: 0,
        ...time,
      };

      const selected: boolean = i === this.state.selectedTime;
      const className: string = css(
        tabStyles.selectableOption,
        selected && tabStyles.selectableSelected,
        tabStyles.paletteSml,
      );

      return (
        <span
          className={className}
          role="button"
          onClick={(): void => this.setState({ selectedTime: i })}
          key={i}
        >
          <svg className={css(tabStyles.resetFont)} viewBox={timeSpec.tsViewbox}>
            <SatieAddons.TimeSignature
              spec={timeSpec}
            />
          </svg>
        </span>
      );
    });

    return (
      <div className={css(tabStyles.tool)}>
        <div className={css(tabStyles.section)}>
          <h3 className={css(tabStyles.toolHeading)}>Time Signature</h3>
          <div className={css(tabStyles.selectableList)}>
            {tsViews}
          </div>
        </div>
        <div className={css(tabStyles.spacer)} />
        <div className={css(tabStyles.section)}>
          <pre className={css(tabStyles.lyPreview)}>
            {this.generateLy()}
          </pre>

          <button className={css(tabStyles.insert)} onClick={this.handleInsertLyClicked}>
            Insert this code into Hacklily
          </button>
        </div>
      </div>
    );
  }

  private generateLy(): string {
    const time: Time = stdTime[this.state.selectedTime];
    const isNumeric: boolean = time.symbol == null;

    return `${isNumeric ? '\\numericTimeSignature' : '\\defaultTimeSignature'}
\\time ${time.beats[0]}/${time.beatTypes[0]}`;
  }

  private handleInsertLyClicked = (): void => {
    this.props.onInsertLy(this.generateLy());
  }
}
