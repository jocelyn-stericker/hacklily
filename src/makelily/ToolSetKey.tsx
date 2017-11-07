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
import { Clef, Key } from 'musicxml-interfaces';
import React from 'react';
import { Addons as SatieAddons } from './satie/src/satie';

import tabStyles from './tabStyles';
import { ToolProps } from './tool';

const keyViewbox: string = '-2 -40 80 80';

const trebleClef: Clef = {
  line: 2,
  sign: 'G',
};

const majors: string = 'cgdaebFCGDAEBfcgda';
function getEnglish(fifths: number, mode: 'major' | 'minor'): string {
  const englishMode: string = mode === 'major' ? 'major' : 'minor';

  const key: string = majors[fifths + 7 + (mode === 'minor' ? 3 : 0)];
  if (!key) {
    return 'Unknown';
  }
  if (key.toLowerCase() === key) {
    if (fifths < 0) {
      // It's flat.
      return `${key.toUpperCase()}\u266D ${englishMode}`;
    } else {
      return `${key.toUpperCase()}\u266F ${englishMode}`;
    }
  }

  return `${key.toUpperCase()} ${englishMode}`;
}

function getLy(fifths: number, mode: 'major' | 'minor'): string {
  const key: string = majors[fifths + 7 + (mode === 'minor' ? 3 : 0)];
  if (!key) {
    return 'Unknown';
  }
  if (key.toLowerCase() === key) {
    if (fifths < 0) {
      // It's flat.
      return `\\key ${key.toLowerCase()}es \\${mode}`;
    } else {
      return `\\key ${key.toLowerCase()}is \\${mode}`;
    }
  }

  return `\\key ${key.toLowerCase()} \\${mode}`;
}

const stdKeys: { [mode: string]: Key[] } = {
  major: Array(15).fill(null).map(
    (_: null, i: number) => ({
      fifths: i - 7,
      mode: 'major',
    }),
  ),
  minor: Array(15).fill(null).map
    ((_: null, i: number) => ({
      fifths: i - 7,
      mode: 'minor',
    }),
  ),
};

interface State {
  selectedKey: number;
  selectedMode: 'major' | 'minor';
}

function getInitialState(props: ToolProps): State {
  let selectedKey: number = 8;
  let selectedMode: 'major' | 'minor' = 'major';

  if (props.keySig.mode === 'minor') {
    selectedMode = 'minor';
  }

  selectedKey = parseInt(String(props.keySig.fifths), 10) + 7;

  return {
    selectedKey,
    selectedMode,
  };
}

/**
 * A tool which allows a key to be inserted.
 */
export default class ToolSetKey extends React.Component<ToolProps, State> {
  state: State = getInitialState(this.props);

  // tslint:disable-next-line max-func-body-length
  render(): JSX.Element {
    const ksViews: JSX.Element[] = stdKeys.major.map((key: Key, i: number) => {
      const keySpec: Key = {
        defaultX: 0,
        defaultY: 0,
        relativeY: 0,
        ...key,
      };

      const selected: boolean = i === this.state.selectedKey;

      return (
        <span
          className={css(tabStyles.selectableOption, selected && tabStyles.selectableSelected)}
          role="button"
          onClick={(): void => this.setState({ selectedKey: i })}
          key={i}
        >
          <svg className={css(tabStyles.resetFont)} viewBox={keyViewbox}>
            <SatieAddons.KeySignature
              clef={trebleClef}
              spec={keySpec}
            />
          </svg>
          <span className={css(tabStyles.selectableDescription)}>
            {getEnglish(key.fifths, this.state.selectedMode)}
          </span>
        </span>
      );
    });

    return (
      <div className={css(tabStyles.tool)}>
        <div className={css(tabStyles.section)}>
          <h3 className={css(tabStyles.toolHeading)}>Key Signature</h3>
          <div className={css(tabStyles.selectableList)}>
            {ksViews}
          </div>
        </div>
        <div className={css(tabStyles.section)}>
          <h3 className={css(tabStyles.toolHeading)}>Mode</h3>
          <form className={css(tabStyles.radioGroup)}>
            <div>
              <input
                id="key-mode-major"
                type="radio"
                checked={this.state.selectedMode === 'major'}
                aria-checked={this.state.selectedMode === 'major'}
                onChange={(): void => this.setState({ selectedMode: 'major' })}
              />
              <label htmlFor="key-mode-major">
                Major (M)
              </label>
            </div>
            <div>
              <input
                id="key-mode-minor"
                type="radio"
                checked={this.state.selectedMode === 'minor'}
                aria-checked={this.state.selectedMode === 'minor'}
                onChange={(): void => this.setState({ selectedMode: 'minor' })}
              />
              <label htmlFor="key-mode-minor">
                Minor (m)
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
    return getLy(
      stdKeys.major[this.state.selectedKey].fifths,
      this.state.selectedMode,
    );
  }

  private handleInsertLyClicked = (): void => {
    this.props.onInsertLy(this.generateLy());
  }
}
