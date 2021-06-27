/**
 * @license
 * This file is part of Makelily
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

import { css, StyleSheet } from "aphrodite";
import { chunk, isEqual, times } from "lodash";
import {
  Count,
  Direction,
  MxmlAccidental,
  NormalAngledSquare,
  Notations,
  TimeModification,
} from "musicxml-interfaces";
import * as React from "react";
import { Addons as SatieAddons } from "./satie/src/satie";

export interface Props {
  accidental: MxmlAccidental;
  direction: Direction;
  dots: number;
  editType: "N" | "R" | "E" | "P";
  notation: Notations;
  note: Count;
  timeModification: TimeModification;
  newMeasure(): void;
  redo(): void;
  setAccidental(accidental: MxmlAccidental): void;
  setDirection(direction: Direction): void;
  setDots(dots: number): void;
  setEditType(editType: "N" | "R" | "E" | "P"): void;
  setNotation(notation: Notations): void;
  setNote(count: Count): void;
  setTimeModification(timeModification: TimeModification): void;
  undo(): void;
}

const dynamics: Direction[] = [
  {
    directionTypes: [
      {
        dynamics: {
          ppp: true,
        },
      },
    ],
  },
  {
    directionTypes: [
      {
        dynamics: {
          pp: true,
        },
      },
    ],
  },
  {
    directionTypes: [
      {
        dynamics: {
          p: true,
        },
      },
    ],
  },
  {
    directionTypes: [
      {
        dynamics: {
          mp: true,
        },
      },
    ],
  },
  {
    directionTypes: [
      {
        dynamics: {
          mf: true,
        },
      },
    ],
  },
  {
    directionTypes: [
      {
        dynamics: {
          f: true,
        },
      },
    ],
  },
  {
    directionTypes: [
      {
        dynamics: {
          ff: true,
        },
      },
    ],
  },
  {
    directionTypes: [
      {
        dynamics: {
          fff: true,
        },
      },
    ],
  },
  {
    directionTypes: [
      {
        dynamics: {
          fp: true,
        },
      },
    ],
  },
  {
    directionTypes: [
      {
        dynamics: {
          sf: true,
        },
      },
    ],
  },
  {
    directionTypes: [
      {
        dynamics: {
          sfz: true,
        },
      },
    ],
  },
  {
    directionTypes: [
      {
        dynamics: {
          sfp: true,
        },
      },
    ],
  },
  {
    directionTypes: [
      {
        dynamics: {
          rfz: true,
        },
      },
    ],
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
        staccato: {},
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
        harmonic: {
          artificial: false,
          basePitch: null,
          natural: true,
          soundingPitch: null,
          touchingPitch: null,
        },
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
export default class NotePalette extends React.Component<Props> {
  render(): JSX.Element {
    const cls: string = css(
      styles.paletteSml,
      styles.paletteBtnOff,
      styles.paletteTxt,
    );

    return (
      <div className={css(styles.controlWidget)}>
        {this.renderSecondRow()}
        <div className={css(styles.controlRow)}>
          {this.renderDuration()}
          {this.renderModifiers()}
          {this.renderAccidentals()}
          <div className={css(styles.spring)} />
          <ul className={css(styles.controls)}>
            <div className={css(styles.controlSeperator)} />
            <a href="#" onClick={this.props.undo} className={cls} role="button">
              <i className="fa-undo fa" />
            </a>
            <div className={css(styles.controlSeperator)} />
            <a href="#" onClick={this.props.redo} className={cls} role="button">
              <i className="fa-undo fa-flip-horizontal fa" />
            </a>
            <div className={css(styles.controlSeperator)} />
            <a
              href="#"
              onClick={this.props.newMeasure}
              className={cls}
              role="button"
            >
              <i className="fa-plus fa" /> Add Bar
            </a>
          </ul>
        </div>
      </div>
    );
  }
  shouldComponentUpdate(nextProps: Props): boolean {
    return !isEqual(nextProps, this.props);
  }

  private renderAccidentals(): JSX.Element {
    const { accidental, editType } = this.props;

    function classNameForAcc(otherAccidental: MxmlAccidental): string {
      return css(
        styles.paletteSml,
        accidental === otherAccidental && editType === "N"
          ? styles.paletteBtnOn
          : styles.paletteBtnOff,
      );
    }

    const getTypeClass: (forType: string) => string = (
      forType: string,
    ): string =>
      css(
        styles.paletteSml,
        editType === forType ? styles.paletteBtnOn : styles.paletteBtnOff,
      );

    return (
      <span className={css(styles.subsection)}>
        <div className={css(styles.controlSeperator)} />
        <ul className={css(styles.controls)}>
          <a
            href="#"
            onClick={this.setAccidentalNone}
            className={classNameForAcc(MxmlAccidental.Natural)}
            role="button"
          >
            <span className={css(styles.bravura)}>
              <span className="mn_">{"\ue261"}</span>
            </span>
          </a>
          <a
            href="#"
            onClick={this.setAccidentalF}
            className={classNameForAcc(MxmlAccidental.Flat)}
            role="button"
          >
            <span className={css(styles.bravura)}>
              <span className="mn_">{"\ue260"}</span>
            </span>
          </a>
          <a
            href="#"
            onClick={this.setAccidentalS}
            className={classNameForAcc(MxmlAccidental.Sharp)}
            role="button"
          >
            <span className={css(styles.bravura)}>
              <span className="mn_">{"\ue262"}</span>
            </span>
          </a>
          <a
            href="#"
            onClick={
              this.props.editType === "R" ? this.setTypeN : this.setTypeR
            }
            className={getTypeClass("R")}
            role="button"
          >
            <span className={css(styles.bravura)}>
              <span className="mn_">{"\ue4e6"}</span>
            </span>
          </a>
          <a
            href="#"
            onClick={
              this.props.editType === "P" ? this.setTypeN : this.setTypeP
            }
            className={getTypeClass("P")}
            role="button"
          >
            <span className={css(styles.bravura)}>
              <span className="mn_">{"\ue52f"}</span>
            </span>
          </a>
          <div className={css(styles.controlSeperator)} />
        </ul>
      </span>
    );
  }

  private renderArticulations(): JSX.Element {
    const { editType, notation, setNotation } = this.props;

    if (editType !== "P") {
      return null;
    }

    const rows: JSX.Element[] = chunk(articulations, 3).map(
      (row: Notations[], idx: number) => {
        const columns: JSX.Element[] = row.map(
          (model: Notations, jdx: number): JSX.Element => {
            const className: string = css(
              isEqual(notation, model)
                ? styles.paletteBtnOn
                : styles.paletteBtnOff,
            );

            return (
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
          },
        );

        return (
          <ul className={css(styles.controls)} key={idx}>
            {columns}
          </ul>
        );
      },
    );

    return (
      <span className={css(styles.subsection)}>
        <div className={css(styles.controlSeperator)} />
        {rows}
      </span>
    );
  }

  private renderDuration(): JSX.Element {
    const { note } = this.props;

    const classNameForCount: (cnt: Count) => string = (cnt: Count): string => {
      return css(
        note === cnt &&
          (this.props.editType === "N" || this.props.editType === "R")
          ? styles.paletteBtnOn
          : styles.paletteBtnOff,
      );
    };

    return (
      <span className={css(styles.subsection)}>
        <div className={css(styles.controlSeperator)} />
        <ul className={css(styles.controls)}>
          <a
            href="#"
            onClick={this.setNote32}
            className={classNameForCount(Count._32nd)}
            role="button"
          >
            <span className={css(styles.bravura)}>
              <span className="mn_">{"\ud834\udd62"}</span>
            </span>
          </a>
          <a
            href="#"
            onClick={this.setNote16}
            className={classNameForCount(Count._16th)}
            role="button"
          >
            <span className={css(styles.bravura)}>
              <span className="mn_">{"\ud834\udd61"}</span>
            </span>
          </a>
          <a
            href="#"
            onClick={this.setNote8}
            className={classNameForCount(Count.Eighth)}
            role="button"
          >
            <span className={css(styles.bravura)}>
              <span className="mn_">{"\ud834\udd60"}</span>
            </span>
          </a>
        </ul>
        <ul className={css(styles.controls)}>
          <a
            href="#"
            onClick={this.setNote4}
            className={classNameForCount(Count.Quarter)}
            role="button"
          >
            <span className={css(styles.bravura)}>
              <span className="mn_">{"\ud834\udd5f"}</span>
            </span>
          </a>
          <a
            href="#"
            onClick={this.setNote2}
            className={classNameForCount(Count.Half)}
            role="button"
          >
            <span className={css(styles.bravura)}>
              <span className="mn_">{"\ud834\udd5e"}</span>
            </span>
          </a>
          <a
            href="#"
            onClick={this.setNote1}
            className={classNameForCount(Count.Whole)}
            role="button"
          >
            <span className={css(styles.bravura)}>
              <span className="mn_">{"\ue0a2"}</span>
            </span>
          </a>
        </ul>
      </span>
    );
  }

  private renderDynamics(): JSX.Element {
    const { direction, editType, setDirection } = this.props;

    if (editType !== "P") {
      return null;
    }

    const rows: JSX.Element[] = chunk(dynamics, 3).map(
      (row: Direction[], idx: number) => {
        const columns: JSX.Element[] = row.map(
          (model: Direction, jdx: number): JSX.Element => {
            const className: string = css(
              isEqual(direction, model)
                ? styles.paletteBtnOn
                : styles.paletteBtnOff,
            );
            const layout: { model: Direction; overrideX?: number } = {
              model,
              overrideX: 0,
            };

            return (
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
          },
        );

        return (
          <ul className={css(styles.controls)} key={idx}>
            {columns}
          </ul>
        );
      },
    );

    return (
      <span className={css(styles.subsection)}>
        <div className={css(styles.controlSeperator)} />
        {rows}
      </span>
    );
  }

  private renderModifiers(): JSX.Element {
    const { dots, timeModification } = this.props;

    const timeModificationTupletClassName: string = css(
      timeModification ? styles.paletteBtnOn : styles.paletteBtnOff,
    );

    const dotEl: JSX.Element[] = times(
      dots || 1,
      (idx: number): JSX.Element => {
        return (
          <span style={{ marginLeft: 3, display: "inline-block" }} key={idx}>
            {"\ue1e7"}
          </span>
        );
      },
    );

    return (
      <span className={css(styles.subsection)}>
        <div className={css(styles.controlSeperator)} />
        <ul className={css(styles.controls)}>
          <a
            href="#"
            onClick={this.toggleDots}
            className={
              dots ? css(styles.paletteBtnOn) : css(styles.paletteBtnOff)
            }
            role="button"
          >
            <span className={css(styles.bravura)}>
              <span className="mn_">
                {"\ud834\udd5f"}
                {dotEl}
              </span>
            </span>
          </a>
          <a
            href="#"
            onClick={this.toggleTuplet}
            className={timeModificationTupletClassName}
            role="button"
          >
            <span className={css(styles.bravura)}>
              <span className="mn_">{"\ue883"}</span>
            </span>
          </a>
        </ul>
      </span>
    );
  }

  private renderSecondRow(): JSX.Element {
    if (this.props.editType === "P") {
      return (
        <span>
          <div className={css(styles.controlRow)}>{this.renderDynamics()}</div>
          <div className={css(styles.controlRow)}>
            {this.renderArticulations()}
          </div>
        </span>
      );
    }

    return null;
  }

  private setAccidentalF: () => void = () =>
    this.props.setAccidental(MxmlAccidental.Flat);
  private setAccidentalNone: () => void = () =>
    this.props.setAccidental(MxmlAccidental.Natural);
  private setAccidentalS: () => void = () =>
    this.props.setAccidental(MxmlAccidental.Sharp);
  private setNote1: () => void = () => this.props.setNote(Count.Whole);
  private setNote16: () => void = () => this.props.setNote(Count._16th);
  private setNote2: () => void = () => this.props.setNote(Count.Half);
  private setNote32: () => void = () => this.props.setNote(Count._32nd);
  private setNote4: () => void = () => this.props.setNote(Count.Quarter);
  private setNote8: () => void = () => this.props.setNote(Count.Eighth);
  private setTypeN: () => void = () => this.props.setEditType("N");
  private setTypeP: () => void = () => this.props.setEditType("P");
  private setTypeR: () => void = () => this.props.setEditType("R");
  private toggleDots: () => void = () =>
    this.props.setDots(((this.props.dots || 0) + 1) % 4);
  private toggleTuplet: () => void = () => {
    this.props.setTimeModification(
      this.props.timeModification ? null : { actualNotes: 3, normalNotes: 2 },
    );
  };
}

const styles = StyleSheet.create({
  bravura: {
    fontSize: 22,
  },

  controlHeading: {
    display: "block",
    fontSize: 10,
    height: 10,
    marginBottom: 2,
    textAlign: "center",
    width: "100%",
  },

  controlWidget: {
    backgroundColor: "white",
    borderBottom: "1px solid #bebebe",
    borderRight: "1px solid #bebebe",
    bottom: 165,
    display: "flex",
    flexDirection: "column",
    left: 15,
    position: "absolute",
    right: 15,
  },

  controlRow: {
    borderTop: "1px solid #bebebe",
    display: "flex",
    flexDirection: "row",
    minHeight: 40,
    overflow: "auto",
  },

  controlSeperator: {
    backgroundColor: "#bebebe",
    height: "100%",
    width: 1,
  },

  controls: {
    display: "flex",
    listStyleType: "none",
    margin: 0,
    paddingLeft: 0,
  },

  buttonBarSpacer: {
    width: 40,
  },

  paletteSml: {
    fontSize: 22,
  },

  paletteTxt: {
    lineHeight: "42px",
  },

  paletteBtnOn: {
    background: "rgb(0, 42, 74)",
    borderBottom: "none",
    borderBottomWidth: 0,
    borderRadius: 0,
    borderTopWidth: 0,
    color: "white",
    cursor: "pointer",
    display: "block",
    fontSize: 14,
    height: 40,
    lineHeight: "36px",
    minWidth: 20,
    overflow: "hidden",
    paddingLeft: 10,
    paddingRight: 10,
    textAlign: "center",
    textDecoration: "none",
  },

  paletteBtnOff: {
    [":hover"]: {
      background: "rgb(26, 68, 100)",
      color: "white",
    },

    background: "#f6f7f7",
    borderBottom: "none",
    borderBottomWidth: 0,
    borderRadius: 0,
    borderTopWidth: 0,
    color: "rgb(0, 0, 238)",
    cursor: "pointer",
    display: "block",
    fontSize: 14,
    height: 40,
    lineHeight: "36px",
    minWidth: 20,
    overflow: "hidden",
    paddingLeft: 10,
    paddingRight: 10,
    textAlign: "center",
    textDecoration: "none",
  },

  spring: {
    flex: 1,
  },

  subsection: {
    display: "flex",
  },
});
