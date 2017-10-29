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
import { Clef } from 'musicxml-interfaces';
import React from 'react';
import { Addons as SatieAddons } from './satie/src/satie';

import tabStyles from './tabStyles';
import { ToolProps } from './tool';

interface LyClef {
  clefViewbox: string;
  enName: string;
  lyName: string;
}

const stdClefs: (Clef & LyClef)[] = [
  {
    clefViewbox: '-26 -47 80 114',
    enName: 'Treble',
    line: 2,
    lyName: 'treble',
    sign: 'G',
  },
  {
    clefViewbox: '-26 -47 80 114',
    enName: 'Bass',
    line: 4,
    lyName: 'bass',
    sign: 'F',
  },
  {
    clefViewbox: '-26 -47 80 114',
    enName: 'Alto',
    line: 3,
    lyName: 'alto',
    sign: 'C',
  },
  {
    clefViewbox: '-26 -47 80 114',
    enName: 'Tenor',
    line: 4,
    lyName: 'tenor',
    sign: 'C',
  },
  {
    clefViewbox: '-32 -47 80 114',
    enName: 'Guitar Tab',
    line: 5,
    lyName: 'moderntab',
    sign: 'TAB',
  },
  {
    clefViewbox: '-32 -47 80 114',
    enName: 'Perc.',
    line: 3,
    lyName: 'percussion',
    sign: 'percussion',
  },
];

interface State {
  octave: number;
  octaveOptional: boolean;
  selectedClef: number;
}

function getInitialState(props: ToolProps): State {
  let selectedClef: number = stdClefs.findIndex((clef: Clef) =>
    clef.line === props.clef.line &&
    clef.sign === props.clef.sign);

  if (selectedClef === -1) {
    selectedClef = 0;
  }

  return {
    octave: parseInt(props.clef.clefOctaveChange, 10) || 0,
    octaveOptional: false,
    selectedClef,
  };
}

export default class ToolSetClef extends React.Component<ToolProps, State> {
  state: State = getInitialState(this.props);

  // tslint:disable-next-line max-func-body-length
  render(): JSX.Element {
    const clefViews: JSX.Element[] = stdClefs.map((clef: Clef & LyClef, i: number) => {
      const clefSpec: Clef & LyClef = {
        defaultX: 0,
        defaultY: 0,
        relativeY: 0,
        ...clef,
        clefOctaveChange: clef.sign !== 'TAB' && clef.sign !== 'percussion' &&
          `${this.state.octave}`,
      };

      const selected: boolean = i === this.state.selectedClef;

      return (
        <span
          className={css(tabStyles.selectableOption, selected && tabStyles.selectableSelected)}
          role="button"
          onClick={(): void => this.setState({ selectedClef: i })}
          key={i}
        >
          <svg className={css(tabStyles.resetFont)} viewBox={clefSpec.clefViewbox}>
            <SatieAddons.Clef
              spec={clefSpec}
            />
          </svg>
          <span className={css(tabStyles.selectableDescription)}>
            {clefSpec.enName}
          </span>
        </span>
      );
    });

    const clefSign: string  = stdClefs[this.state.selectedClef].sign;
    const canChangeOctave: boolean = clefSign !== 'TAB' && clefSign !== 'percussion';

    return (
      <div className={css(tabStyles.tool)}>
        <div className={css(tabStyles.section)}>
          <h3 className={css(tabStyles.toolHeading)}>Clef</h3>
          <div className={css(tabStyles.selectableList)}>
            {clefViews}
          </div>
        </div>
        <div className={css(tabStyles.section)}>
          <h3 className={css(tabStyles.toolHeading)}>Octave</h3>
          <form className={css(tabStyles.radioGroup)}>
            <div>
              <input
                id="set-clef-15va"
                type="radio"
                checked={this.state.octave === 2}
                aria-checked={this.state.octave === 2}
                onChange={(): void => this.setState({ octave: 2 })}
              />
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
              />
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
              />
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
              />
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
              />
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
                onChange={(): void => this.setState({ octaveOptional: !this.state.octaveOptional })}
              />
              <label htmlFor="clef-octave-optional">
                Octave change is optional (in parentheses)
              </label>
            </div>
          </form>
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
    const clef: string  = stdClefs[this.state.selectedClef].lyName;
    if (clef === 'moderntab' || clef === 'percussion' || this.state.octave === 0) {
      return `\\clef ${clef}`;
    }

    const openOctave: string = this.state.octaveOptional ? '(' : '';
    const closeOctave: string = this.state.octaveOptional ? ')' : '';
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
        return 'Error: unknown octave';
    }
  }

  private handleInsertLyClicked = (): void => {
    this.props.onInsertLy(this.generateLy());
  }
}
