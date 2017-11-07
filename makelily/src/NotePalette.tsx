/**
 * @license
 * This file is part of Makelily
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
import { chunk, isEqual, times } from 'lodash';
import {Count, Direction, MxmlAccidental,
    NormalAngledSquare, Notations, TimeModification} from 'musicxml-interfaces';
import * as React from 'react';
import { Addons as SatieAddons } from './satie/src/satie';

interface ButtonGroupProps {
  accidental: MxmlAccidental;
  direction: Direction;
  dots: number;
  editType: 'N' | 'R' | 'E' | 'P';
  notation: Notations;
  note: Count;
  timeModification: TimeModification;
  setAccidental(accidental: MxmlAccidental): void;
  setDirection(direction: Direction): void;
  setDots(dots: number): void;
  setEditType(editType: 'N' | 'R' | 'E' | 'P'): void;
  setNotation(notation: Notations): void;
  setNote(count: Count): void;
  setTimeModification(timeModification: TimeModification): void;
}

const dynamics: Direction[] = [
  {
    directionTypes: [{
      dynamics: {
        ppp: true,
      },
    }],
  },
  {
    directionTypes: [{
      dynamics: {
        pp: true,
      },
    }],
  },
  {
    directionTypes: [{
      dynamics: {
        p: true,
      },
    }],
  },
  {
    directionTypes: [{
      dynamics: {
        ppp: true,
      },
    }],
  },
  {
    directionTypes: [{
      dynamics: {
        mp: true,
      },
    }],
  },
  {
    directionTypes: [{
      dynamics: {
        mf: true,
      },
    }],
  },
  {
    directionTypes: [{
      dynamics: {
        f: true,
      },
    }],
  },
  {
    directionTypes: [{
      dynamics: {
        ff: true,
      },
    }],
  },
  {
    directionTypes: [{
      dynamics: {
        fff: true,
      },
    }],
  },
  {
    directionTypes: [{
      dynamics: {
        fp: true,
      },
    }],
  },
  {
    directionTypes: [{
      dynamics: {
        sf: true,
      },
    }],
  },
  {
    directionTypes: [{
      dynamics: {
        sfz: true,
      },
    }],
  },
  {
    directionTypes: [{
      dynamics: {
        sffz: true,
      },
    }],
  },
  {
    directionTypes: [{
      dynamics: {
        sfp: true,
      },
    }],
  },
  {
    directionTypes: [{
      dynamics: {
        sfpp: true,
      },
    }],
  },
  {
    directionTypes: [{
      dynamics: {
        rfz: true,
      },
    }],
  },
  {
    directionTypes: [{
      dynamics: {
        rf: true,
      },
    }],
  },
];

const articulations: Notations[] = [
  {
    fermatas: [
      {
        shape: NormalAngledSquare.Normal,
      },
    ],
  },
  {
    fermatas: [
      {
        shape: NormalAngledSquare.Angled,
      },
    ],
  },
  {
    fermatas: [
      {
        shape: NormalAngledSquare.Square,
      },
    ],
  },
  {
    articulations: [
      {
        accent: {},
      },
    ],
  },
  {
    articulations: [
      {
        staccato: {},
      },
    ],
  },
  {
    articulations: [
      {
        staccatissimo: {},
      },
    ],
  },
  {
    articulations: [
      {
        tenuto: {},
      },
    ],
  },
  {
    articulations: [
      {
        accent: {},
        staccato: {},
      },
    ],
  },
  {
    articulations: [
      {
        strongAccent: {},
      },
    ],
  },
  {
    technicals: [
      {
        openString: {},
      },
    ],
  },
  {
    technicals: [
      {
        stopped: {},
      },
    ],
  },
  {
    technicals: [
      {
        snapPizzicato: {},
      },
    ],
  },
  {
    technicals: [
      {
        upBow: {},
      },
    ],
  },
  {
    technicals: [
      {
        downBow: {},
      },
    ],
  },
];

/**
 * Renders a list of tools that can be selected in the note editor.
 */
export default class NotePalette extends React.Component<ButtonGroupProps, {}> {
  // tslint:disable-next-line cyclomatic-complexity max-func-body-length
  render(): JSX.Element {
    const { editType } = this.props;

    const getTypeClass: (forType: string) => string = (forType: string): string =>
        css(styles.paletteSml,
            editType === forType ? styles.paletteBtnOn : styles.paletteBtnOff);

    return (
      <div className={css(styles.controlWidget)}>
        <ul className={css(styles.controls)}>
          {/* tslint:disable-next-line react-a11y-anchors */}
          <a
            href="#"
            onClick={this.setTypeN}
            className={getTypeClass('N')}
            role="button"
          >
            <span className="mn_">{'\ud834\udd5f'}</span>
          </a>
          {/* tslint:disable-next-line react-a11y-anchors */}
          <a
            href="#"
            onClick={this.setTypeR}
            className={getTypeClass('R')}
            role="button"
          >
            <span className="mn_">{'\ue4e6'}</span>
          </a>
          {/* tslint:disable-next-line react-a11y-anchors */}
          <a
            href="#"
            onClick={this.setTypeP}
            className={getTypeClass('P')}
            role="button"
          >
            <span className="mn_">{'\ue52f'}</span>
          </a>
        </ul>
        {this.renderDynamics()}
        {this.renderArticulations()}
        {this.renderDuration()}
        {this.renderModifiers()}
        {this.renderAccidentals()}
      </div>
    );
  }
  shouldComponentUpdate(nextProps: ButtonGroupProps): boolean {
    return !isEqual(nextProps, this.props);
  }

  private renderAccidentals(): JSX.Element {
    const { accidental, editType } = this.props;

    if (editType !== 'N') {
      return null;
    }

    function classNameForAcc(otherAccidental: MxmlAccidental): string {
      return css(
        styles.paletteSml,
        accidental === otherAccidental ? styles.paletteBtnOn : styles.paletteBtnOff,
      );
    }

    return (
      <span className={css(styles.subsection)}>
        <div className={css(styles.controlSeperator)} />
        <ul className={css(styles.controls)}>
          {/* tslint:disable-next-line react-a11y-anchors */}
          <a
            href="#"
            onClick={this.setAccidentalNone}
            className={classNameForAcc(MxmlAccidental.Natural)}
            role="button"
          >
            <span className="mn_">{'\ue261'}</span>
          </a>
          {/* tslint:disable-next-line react-a11y-anchors */}
          <a
            href="#"
            onClick={this.setAccidentalF}
            className={classNameForAcc(MxmlAccidental.Flat)}
            role="button"
          >
            <span className="mn_">{'\ue260'}</span>
          </a>
          {/* tslint:disable-next-line react-a11y-anchors */}
          <a
            href="#"
            onClick={this.setAccidentalS}
            className={classNameForAcc(MxmlAccidental.Sharp)}
            role="button"
          >
            <span className="mn_">{'\ue262'}</span>
          </a>
        </ul>
      </span>
    );
  }

  private renderArticulations(): JSX.Element {
    const { editType, notation, setNotation } = this.props;

    if (editType !== 'P') {
      return null;
    }

    const rows: JSX.Element[] =
      chunk(articulations, 3).map((row: Notations[], idx: number) => {
        const columns: JSX.Element[] = row.map(
          (model: Notations, jdx: number): JSX.Element => {
            const className: string = css(
              isEqual(notation, model) ? styles.paletteBtnOn : styles.paletteBtnOff);

            return (
              /* tslint:disable-next-line react-a11y-anchors */
              <a
                href="#"
                onClick={(): void => setNotation(model)}
                key={jdx}
                className={className}
                role="button"
              >
                <SatieAddons.NotationView spec={model} />
              </a>
            );
          });

        return (
          <ul className={css(styles.controls)} key={idx}>
            {columns}
          </ul>
        );
      });

    return (
      <span className={css(styles.subsection)}>
        <div className={css(styles.controlSeperator)} />
        {rows}
      </span>
    );
  }

  private renderDuration(): JSX.Element {
    const { editType, note } = this.props;

    if (editType !== 'N' && editType !== 'R') {
      return null;
    }

    function classNameForCount(cnt: Count): string {
      return css(
        note === cnt ?
          styles.paletteBtnOn :
          styles.paletteBtnOff,
      );
    }

    return (
      <span className={css(styles.subsection)}>
        <div className={css(styles.controlSeperator)} />
        <ul className={css(styles.controls)}>
          {/* tslint:disable-next-line react-a11y-anchors */}
          <a
            href="#"
            onClick={this.setNote32}
            className={classNameForCount(Count._32nd)}
            role="button"
          >
             <span className="mn_">{'\ud834\udd62'}</span>
          </a>
          {/* tslint:disable-next-line react-a11y-anchors */}
          <a
            href="#"
            onClick={this.setNote16}
            className={classNameForCount(Count._16th)}
            role="button"
          >
            <span className="mn_">{'\ud834\udd61'}</span>
          </a>
          {/* tslint:disable-next-line react-a11y-anchors */}
          <a
            href="#"
            onClick={this.setNote8}
            className={classNameForCount(Count.Eighth)}
            role="button"
          >
            <span className="mn_">{'\ud834\udd60'}</span>
          </a>
        </ul>
        <ul className={css(styles.controls)}>
          {/* tslint:disable-next-line react-a11y-anchors */}
          <a
            href="#"
            onClick={this.setNote4}
            className={classNameForCount(Count.Quarter)}
            role="button"
          >
            <span className="mn_">{'\ud834\udd5f'}</span>
          </a>
          {/* tslint:disable-next-line react-a11y-anchors */}
          <a
            href="#"
            onClick={this.setNote2}
            className={classNameForCount(Count.Half)}
            role="button"
          >
            <span className="mn_">{'\ud834\udd5e'}</span>
          </a>
          {/* tslint:disable-next-line react-a11y-anchors */}
          <a
            href="#"
            onClick={this.setNote1}
            className={classNameForCount(Count.Whole)}
            role="button"
          >
            <span className="mn_">{'\ue0a2'}</span>
          </a>
        </ul>
      </span>
    );
  }

  private renderDynamics(): JSX.Element {
    const { direction, editType, setDirection } = this.props;

    if (editType !== 'P') {
      return null;
    }

    const rows: JSX.Element[] =
      chunk(dynamics, 3).map((row: Direction[], idx: number) => {
        const columns: JSX.Element[] = row.map(
          (model: Direction, jdx: number): JSX.Element => {
            const className: string = css(
              isEqual(direction, model) ? styles.paletteBtnOn : styles.paletteBtnOff);
            const layout: {model: Direction, overrideX?: number} = {
              model,
              overrideX: 0,
            };

            return (
              /* tslint:disable-next-line react-a11y-anchors */
              <a
                href="#"
                onClick={(): void => setDirection(model)}
                key={jdx}
                className={className}
                role="button"
              >
                <SatieAddons.Direction layout={layout} />
              </a>
            );
          });

        return (
          <ul className={css(styles.controls)} key={idx}>
            {columns}
          </ul>
        );
      });

    return (
      <span className={css(styles.subsection)}>
        <div className={css(styles.controlSeperator)} />
        {rows}
      </span>
    );
  }

  private renderModifiers(): JSX.Element {
    const { dots, editType, timeModification } = this.props;

    const timeModificationTupletClassName: string = css (
      timeModification ? styles.paletteBtnOn : styles.paletteBtnOff);

    if (editType !== 'N' && editType !== 'R') {
      return null;
    }

    const dotEl: JSX.Element[] = times(dots || 1, (idx: number): JSX.Element => {
      return (
        <span
          style={{ marginLeft: 3, display: 'inline-block' }}
          key={idx}
        >
          {'\ue1e7'}
        </span>
      );
    });

    return (
      <span className={css(styles.subsection)}>
        <div className={css(styles.controlSeperator)} />
        <ul className={css(styles.controls)}>
          {/* tslint:disable-next-line react-a11y-anchors */}
          <a
            href="#"
            onClick={this.toggleDots}
            className={dots ? css(styles.paletteBtnOn) : css(styles.paletteBtnOff)}
            role="button"
          >
            <span className="mn_">
              {'\ud834\udd5f'}
              {dotEl}
            </span>
          </a>
          {/* tslint:disable-next-line react-a11y-anchors */}
          <a
            href="#"
            onClick={this.toggleTuplet}
            className={timeModificationTupletClassName}
            role="button"
          >
            <span className="mn_">{'\ue883'}</span>
          </a>
        </ul>
      </span>
    );
  }

  private setAccidentalF: () => void = () => this.props.setAccidental(MxmlAccidental.Flat);
  private setAccidentalNone: () => void = () => this.props.setAccidental(MxmlAccidental.Natural);
  private setAccidentalS: () => void = () => this.props.setAccidental(MxmlAccidental.Sharp);
  private setNote1: () => void = () => this.props.setNote(Count.Whole);
  private setNote16: () => void = () => this.props.setNote(Count._16th);
  private setNote2: () => void = () => this.props.setNote(Count.Half);
  private setNote32: () => void = () => this.props.setNote(Count._32nd);
  private setNote4: () => void = () => this.props.setNote(Count.Quarter);
  private setNote8: () => void = () => this.props.setNote(Count.Eighth);
  private setTypeN: () => void = () => this.props.setEditType('N');
  private setTypeP: () => void = () => this.props.setEditType('P');
  private setTypeR: () => void = () => this.props.setEditType('R');
  private toggleDots: () => void = () => this.props.setDots(((this.props.dots || 0) + 1) % 4);
  private toggleTuplet: () => void = () => {
    this.props.setTimeModification(
            this.props.timeModification ? null : { actualNotes: 3, normalNotes: 2 },
        );
  }
}

// tslint:disable-next-line typedef
const styles = StyleSheet.create({
  controlHeading: {
    display: 'block',
    fontSize: 10,
    height: 10,
    marginBottom: 2,
    textAlign: 'center',
    width: '100%',
  },

  controlWidget: {
    backgroundColor: 'white',
    boxShadow: '1px 1px 3px rgba(0, 0, 0, 0.5)',
    display: 'flex',
    flexDirection: 'row',
    minHeight: 40,
    overflow: 'auto',
  },

  controlSeperator: {
    backgroundColor: '#bebebe',
    height: '100%',
    width: 1,
  },

  controls: {
    display: 'flex',
    listStyleType: 'none',
    margin: 0,
    paddingLeft: 0,
  },

  buttonBarSpacer: {
    width: 40,
  },

  paletteSml: {
    fontSize: 22,
  },

  paletteBtnOn: {
    background: 'rgb(83, 199, 242)',
    borderBottom: 'none',
    borderBottomWidth: 0,
    borderRadius: 0,
    borderTopWidth: 0,
    color: 'white',
    cursor: 'pointer',
    display: 'block',
    fontSize: 22,
    height: 40,
    lineHeight: '36px',
    overflow: 'hidden',
    textAlign: 'center',
    textDecoration: 'none',
    width: 40,
  },

  paletteBtnOff: {
    [':hover']: {
      background: 'rgb(248, 248, 248)',
    },

    background: 'rgb(238, 238, 238)',
    borderBottom: 'none',
    borderBottomWidth: 0,
    borderRadius: 0,
    borderTopWidth: 0,
    color: 'rgb(97, 97, 97)',
    cursor: 'pointer',
    display: 'block',
    fontSize: 22,
    height: 40,
    lineHeight: '36px',
    overflow: 'hidden',
    textAlign: 'center',
    textDecoration: 'none',
    width: 40,
  },

  subsection: {
    display: 'flex',
  },
});
