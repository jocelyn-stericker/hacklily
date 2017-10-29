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

import { css, StyleSheet } from 'aphrodite';
import React from 'react';
import { Application, requireFont } from './satie/src/satie';

import { ToolProps } from './tool';
import ToolNoteEdit from './ToolNoteEdit';
import ToolNotFound from './ToolNotFound';
import ToolSetClef from './ToolSetClef';
import ToolSetKey from './ToolSetKey';
import ToolSetTime from './ToolSetTime';

import { parseClef, parseKeySig, parseTime } from './parseLy';

export const satieApplication: Application = new Application({
  preloadedFonts: ['Alegreya', 'Alegreya (bold)'],
  satieRoot: `${location.protocol}//${location.host}/vendor/`,
});

requireFont('Bravura', 'root://bravura/otf/Bravura.otf');

interface InsertMode {
  Component: React.ComponentType<ToolProps>;
  key: string;
  name: string;
}

const modes: InsertMode[] = [
  {
    Component: ToolSetClef,
    key: 'clef',
    name: 'Set Clef',
  },
  {
    Component: ToolSetKey,
    key: 'key',
    name: 'Set Key Signature',
  },
  {
    Component: ToolSetTime,
    key: 'time',
    name: 'Set Time Signature',
  },
  {
    Component: ToolNoteEdit,
    key: 'notes',
    name: 'Insert Notes',
  },
];

interface Props {
  clef: string;
  defaultTool: string;
  keySig: string;
  singleTaskMode: boolean;
  time: string;
  onInsertLy(ly: string): void;
}

interface State {
  toolKey: string;
}

export default class Makelily extends React.Component<Props, State> {
  state: State = {
    toolKey: this.props.defaultTool || 'clef',
  };

  render(): JSX.Element {
    const modeElements: JSX.Element[] = modes.map((mode: InsertMode, i: number) => {
      const className: string = css(
        styles.modeItem,
        i + 1 === modes.length && styles.modeItemLast,
        mode.key === this.state.toolKey && styles.modeItemSelected,
      );

      return (
        <li
          className={className}
          onClick={(): void => this.setState({ toolKey: mode.key })}
          role="button"
          key={mode.key}
        >
          {mode.name}
        </li>
      );
    });

    const activeMode: InsertMode = modes
      .find((mode: InsertMode) => mode.key === this.state.toolKey);
    // tslint:disable-next-line variable-name
    const Tool: React.ComponentType<ToolProps> = activeMode ?
      activeMode.Component :
      ToolNotFound;

    let bar: JSX.Element | null;
    if (!this.props.singleTaskMode) {
      bar = (
        <div className={css(styles.modeBar)}>
          <h2 className={css(styles.heading)}>
            Hacklily Tools
          </h2>
          <ul className={css(styles.modeList)}>
            {modeElements}
          </ul>
        </div>
      );
    }

    const contentClass: string = css(
      styles.content,
      this.props.singleTaskMode && styles.contentNoBar,
    );

    return (
      <span>
      <div className={css(styles.modalBg)} />
      <div className={css(styles.modal)}>
        {bar}
        <div className={contentClass}>
          <Tool
            clef={parseClef(this.props.clef)}
            keySig={parseKeySig(this.props.keySig)}
            time={parseTime(this.props.time)}
            onInsertLy={this.props.onInsertLy}
          />
        </div>
      </div>
      </span>
    );
  }
}

const modeBarWidth: number = 180;

// tslint:disable-next-line typedef
const styles = StyleSheet.create({
  content: {
    bottom: 0,
    left: modeBarWidth,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  contentNoBar: {
    left: 0,
  },
  heading: {
    cursor: 'default',
    fontSize: 18,
    marginBottom: 0,
    marginTop: 8,
    paddingBottom: 16,
    paddingLeft: 16,
    paddingTop: 16,
  },
  modal: {
    background: 'white',
    border: '1px solid grey',
    borderRadius: 4,
    height: 600,
    left: 'calc(50% - 1020px / 2)',
    overflow: 'hidden',
    position: 'fixed',
    top: 'calc((50% - 600px / 2) * 2 / 3)',
    width: 1020,
    zIndex: 1001,
  },
  modalBg: {
    background: 'black',
    bottom:0,
    left: 0,
    opacity: 0.4,
    position: 'fixed',
    right: 0,
    top: 0,
    zIndex: 1000,
  },
  modeBar: {
    backgroundColor: '#F6F7F7',
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
    width: modeBarWidth,
  },
  modeItem: {
    ':hover': {
      textDecoration: 'underline',
    },
    borderTop: '1px solid #D6D8DA',
    cursor: 'pointer',
    fontSize: 15,
    padding: '8px 16px',
  },
  modeItemLast: {
    borderBottom: '1px solid #D6D8DA',
  },
  modeItemSelected: {
    ':hover': {
      color: 'black',
      textDecoration: 'none',
    },
    cursor: 'default',
    fontWeight: 'bold',
  },
  modeList: {
    listStyleType: 'none',
    margin: 0,
    padding: 0,
  },
});
