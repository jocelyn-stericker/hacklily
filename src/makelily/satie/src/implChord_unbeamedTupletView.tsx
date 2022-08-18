/**
 * @source: https://github.com/emilyskidsister/satie/
 *
 * @license
 * (C) Jocelyn Stericker <jocelyn@nettek.ca> 2015.
 * Part of the Satie music engraver <https://github.com/emilyskidsister/satie>.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * @file Renders a tuplet outside of a beam. Unbeamed tuplets are created
 * by the beam postprocessor, since they share many similaraties.
 */

// Note that we use notehadBlack regardless of the notehead.
// This keeps spacing consistent, even in beam groups with rests.

import * as React from "react";
import { AboveBelow } from "musicxml-interfaces";
import { Component } from "react";
import * as PropTypes from "prop-types";
import { first, last } from "lodash";

import { bravura, getFontOffset } from "./private_smufl";

import TupletNumberView from "./implChord_tupletNumberView";
import { IBeamLayout } from "./implChord_beamLayout";

export interface IProps {
  key?: string | number;
  stroke: string;
  stemWidth: number;
  layout: IBeamLayout;
}

export default class UnbeamedTuplet extends Component<IProps, {}> {
  static contextTypes = {
    originY: PropTypes.number.isRequired,
  } as any;

  context: {
    originY: number;
  };

  render(): any {
    const { stroke, layout } = this.props;
    const { tuplet, x } = layout;
    const { placement } = tuplet;
    const yOffset = placement === AboveBelow.Above ? 8 : -8;
    const isSingleNote = x.length === 1;

    const x1 = this._getX1();
    const x2 = this._getX2();
    const y1 = this._getY1(1);
    const y2 = this._getY2(1);
    const y1Low = this._getY1(0);
    const y2Low = this._getY2(0);

    const y1Near = placement === AboveBelow.Below ? y1 : y1Low;
    const y1Far = placement === AboveBelow.Below ? y1Low : y1;
    const y2Near = placement === AboveBelow.Below ? y2 : y2Low;
    const y2Far = placement === AboveBelow.Below ? y2Low : y2;

    return (
      <g>
        {!isSingleNote && (
          <polygon
            fill={stroke}
            key="p1"
            points={
              x1 +
              "," +
              y1Low +
              " " +
              x2 +
              "," +
              y2Low +
              " " +
              x2 +
              "," +
              y2 +
              " " +
              x1 +
              "," +
              y1
            }
            stroke={stroke}
            strokeWidth={0}
          />
        )}
        {!isSingleNote && (
          <line
            fill={stroke}
            key="p2"
            stroke={stroke}
            strokeWidth={bravura.engravingDefaults.tupletBracketThickness * 10}
            x1={x1 + 0.5}
            x2={x1 + 0.5}
            y1={y1Near}
            y2={y1Far + yOffset}
          />
        )}
        {!isSingleNote && (
          <line
            fill={this.props.stroke}
            key="p3"
            stroke={stroke}
            strokeWidth={bravura.engravingDefaults.tupletBracketThickness * 10}
            x1={x2 - 0.5}
            x2={x2 - 0.5}
            y1={y2Near}
            y2={y2Far + yOffset}
          />
        )}
        <TupletNumberView tuplet={tuplet} x1={x1} x2={x2} y1={y1} y2={y2} />
      </g>
    );
  }

  /**
   * Offset because the note-head has a non-zero width.
   */
  getLineXOffset() {
    return (this.direction() * -this.props.stemWidth) / 2;
  }

  /**
   *  1 if the notes go up,
   * -1 if the notes go down.
   */
  direction() {
    return this.props.layout.tuplet.placement === AboveBelow.Above ? 1 : -1;
  }

  private _withXOffset(x: number) {
    return (
      x +
      getFontOffset("noteheadBlack", this.direction())[0] * 10 +
      this.getLineXOffset()
    );
  }

  private _getX1() {
    const { x } = this.props.layout;
    return this._withXOffset(first(x)) - 4;
  }

  private _getX2() {
    const { x } = this.props.layout;
    return this._withXOffset(last(x)) + 4;
  }

  private _getY1(incl: number) {
    const { originY } = this.context;
    const { layout } = this.props;
    const { y1 } = layout;
    return (
      originY -
      y1 -
      this.direction() *
        getFontOffset("noteheadBlack", this.direction())[1] *
        10 -
      (incl || 0) * (bravura.engravingDefaults.tupletBracketThickness * 10)
    );
  }

  private _getY2(incl: number) {
    const { originY } = this.context;
    const { layout } = this.props;
    const { y2 } = layout;
    return (
      originY -
      y2 -
      this.direction() *
        getFontOffset("noteheadBlack", this.direction())[1] *
        10 -
      (incl || 0) * (bravura.engravingDefaults.tupletBracketThickness * 10)
    );
  }
}
